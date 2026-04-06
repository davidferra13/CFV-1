package com.cheflowhq.desktop.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.cheflowhq.desktop.R

class QuickNotesWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        private val NOTE_VIEW_IDS = intArrayOf(
            R.id.widget_notes_1,
            R.id.widget_notes_2,
            R.id.widget_notes_3,
            R.id.widget_notes_4,
            R.id.widget_notes_5
        )

        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_quick_notes)

            // Tap "add note" opens dashboard
            val addIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/dashboard"))
            val addPending = PendingIntent.getActivity(context, 1, addIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_notes_add, addPending)
            views.setOnClickPendingIntent(R.id.widget_notes_root, addPending)

            if (!WidgetDataFetcher.isConfigured(context)) {
                views.setTextViewText(R.id.widget_notes_add, "Tap to set up ChefFlow")
                manager.updateAppWidget(widgetId, views)
                return
            }

            Thread {
                val resp = WidgetDataFetcher.fetchJson(context, "/api/v2/quick-notes?status=raw&limit=5")
                val notes = resp?.optJSONObject("data")?.optJSONArray("notes")
                val count = notes?.length() ?: 0

                if (count > 0) {
                    views.setTextViewText(R.id.widget_notes_count, "$count notes")
                }

                // Populate note lines
                for (i in NOTE_VIEW_IDS.indices) {
                    if (i < count) {
                        val note = notes?.optJSONObject(i)
                        val text = note?.optString("text", "") ?: ""
                        views.setTextViewText(NOTE_VIEW_IDS[i], text)
                        views.setViewVisibility(NOTE_VIEW_IDS[i], View.VISIBLE)
                    } else {
                        views.setViewVisibility(NOTE_VIEW_IDS[i], View.GONE)
                    }
                }

                manager.updateAppWidget(widgetId, views)
            }.start()
        }
    }
}
