// Remotion entry point — registers all compositions for CLI and bundler.
// Usage: npx remotion render lib/remotion/index.ts EventRecap output.mp4

import { Composition, registerRoot } from 'remotion'
import {
  EventRecapComposition,
  type EventRecapProps,
} from '../../components/remotion/event-recap-composition'

function Root() {
  return (
    <Composition
      id="EventRecap"
      component={EventRecapComposition}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={{
        occasion: 'Preview Event',
        eventDate: 'January 1, 2026',
        guestCount: 4,
        menuItems: ['Seared Scallops', 'Beef Tenderloin', 'Chocolate Lava Cake'],
        totalPaidDisplay: '$750',
        chefName: 'Chef David',
      }}
    />
  )
}

registerRoot(Root)
