"""Protective review evidence, tested only with generated text, shapes and silence."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))
from PIL import Image
from privacy_core import Store, PrivacyBlocked
from review_media import LocalPlayer, player_command, probe_tracks


class FullReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        self.path = self.source / 'geometry.png'
        Image.new('RGB', (32, 32), 'green').save(self.path)
        self.sidecar = self.source / 'geometry.json'
        self.sidecar.write_text('{"fixture":true}', encoding='utf-8')
        self.store = Store(self.root / 'runtime')
        self.asset = self.store.inventory(self.path, 'synthetic')

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def confirm(self, unit):
        self.store.mark_review_unit(self.asset, unit['id'])
        self.store.mark_review_unit(self.asset, unit['id'], confirmed=True)

    def approve(self):
        self.store.decide(self.asset, 'approved_local_archive', complete_review=True)

    def test_checkbox_alone_does_not_authorize(self):
        with self.assertRaises(PrivacyBlocked):
            self.approve()

    def test_every_companion_requires_separate_review(self):
        units = self.store.review_plan(self.asset)
        self.assertEqual({u['kind'] for u in units}, {'image', 'text'})
        self.confirm(units[0])
        with self.assertRaises(PrivacyBlocked):
            self.approve()
        self.confirm(units[1])
        self.approve()
        self.assertEqual(self.store.approved_bytes(self.path), self.path.read_bytes())

    def test_confirmation_requires_prior_open(self):
        unit = self.store.review_plan(self.asset)[0]
        with self.assertRaises(PrivacyBlocked):
            self.store.mark_review_unit(self.asset, unit['id'], confirmed=True)

    def test_changed_sidecar_invalidates_review_before_approval(self):
        for unit in self.store.review_plan(self.asset):
            self.confirm(unit)
        self.sidecar.write_text('{"fixture":"changed"}', encoding='utf-8')
        with self.assertRaises(PrivacyBlocked):
            self.approve()
        self.store.inventory(self.path, 'synthetic')
        self.assertTrue(all(state == 'unreviewed' for state in self.store.review_states(self.asset).values()))

    def test_changed_sidecar_after_approval_denies_consumer(self):
        for unit in self.store.review_plan(self.asset):
            self.confirm(unit)
        self.approve()
        self.sidecar.write_text('{}', encoding='utf-8')
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.path)

    def test_forged_confirmation_and_plan_are_denied(self):
        for unit in self.store.review_plan(self.asset):
            self.confirm(unit)
        with self.store.db:
            self.store.db.execute("UPDATE human_review_units SET signature='forged'")
        with self.assertRaises(PrivacyBlocked):
            self.approve()
        with self.store.db:
            self.store.db.execute("UPDATE human_review_plans SET units='[]'")
        with self.assertRaises(PrivacyBlocked):
            self.store.review_plan(self.asset)

    def test_forged_component_metadata_cannot_hide_a_companion(self):
        row = self.store.row(self.asset)
        only_image = [part for part in json.loads(row['components']) if part['path'] == str(self.path)]
        with self.store.db:
            self.store.db.execute('UPDATE assets SET components=? WHERE id=?', (json.dumps(only_image), self.asset))
        self.assertEqual(len(self.store.review_plan(self.asset)), 2)

    def test_legacy_signed_approval_without_review_evidence_is_held(self):
        row = self.store.row(self.asset)
        signature = self.store._sign(row, 'approved_local_archive', 1)
        with self.store.db:
            self.store.db.execute("UPDATE assets SET decision='approved_local_archive',revision=1,signature=? WHERE id=?",
                                  (signature, self.asset))
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.path)

    def test_unsupported_companion_prevents_whole_bundle_approval(self):
        (self.source / 'geometry.bin').write_bytes(b'harmless unsupported fixture')
        self.store.inventory(self.path, 'synthetic')
        for unit in self.store.review_plan(self.asset):
            if unit['kind'] != 'unsupported':
                self.confirm(unit)
        with self.assertRaises(PrivacyBlocked):
            self.approve()

    def test_animation_exposes_each_frame(self):
        animated = self.source / 'animation.gif'
        Image.new('RGB', (16, 16), 'red').save(animated, save_all=True,
            append_images=[Image.new('RGB', (16, 16), 'blue')], duration=100)
        asset = self.store.inventory(animated, 'synthetic')
        units = self.store.review_plan(asset)
        self.assertEqual([(u['kind'], u['stream']) for u in units], [('image_frame', 0), ('image_frame', 1)])

    def test_removal_review_prevents_plan_or_view_access(self):
        units = self.store.review_plan(self.asset)
        self.store.decide(self.asset, 'removal_review')
        with self.assertRaises(PrivacyBlocked):
            self.store.review_unit(self.asset, units[0]['id'])

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'installed decoders required')
    def test_video_audio_and_subtitle_tracks_have_explicit_review_states(self):
        video = self.source / 'tracks.mkv'
        subtitle = self.root / 'generated.srt'
        subtitle.write_text('1\n00:00:00,000 --> 00:00:00,500\nHARMLESS FIXTURE\n', encoding='utf-8')
        subprocess.run([shutil.which('ffmpeg'), '-nostdin', '-v', 'error', '-f', 'lavfi', '-i',
            'color=c=blue:s=32x32:r=2:d=1', '-f', 'lavfi', '-i', 'anullsrc=r=8000:cl=mono',
            '-i', str(subtitle), '-t', '1', '-map', '0:v', '-map', '1:a', '-map', '2:s',
            '-c:v', 'ffv1', '-c:a', 'pcm_s16le', '-c:s', 'srt', '-threads', '1', str(video)],
            capture_output=True, check=True, timeout=20)
        asset = self.store.inventory(video, 'synthetic')
        units = self.store.review_plan(asset)
        self.assertEqual([u['kind'] for u in units], ['video', 'audio', 'unsupported'])
        self.assertEqual([u['stream'] for u in units], [0, 1, 2])

    @unittest.skipUnless(shutil.which('ffplay'), 'installed player required')
    def test_player_uses_explicit_track_and_ignores_reporting_proxy_environment(self):
        unit = {'path': str(self.path), 'kind': 'video', 'stream': 2}
        command = player_command(unit)
        self.assertEqual(command[command.index('-vst') + 1], '2')
        self.assertIn('-an', command)
        self.assertIn('-sn', command)
        self.assertEqual(command[command.index('-protocol_whitelist') + 1], 'file,pipe')
        with patch.dict(os.environ, {'FFREPORT': 'file=fixture-report.log', 'HTTP_PROXY': 'http://example.invalid'}), \
             patch('review_media.subprocess.Popen') as popen:
            player = LocalPlayer(unit)
            environment = popen.call_args.kwargs['env']
            self.assertNotIn('FFREPORT', environment)
            self.assertNotIn('HTTP_PROXY', environment)
            self.assertEqual(popen.call_args.kwargs['stdout'], subprocess.DEVNULL)
            player.close()


if __name__ == '__main__':
    unittest.main()
