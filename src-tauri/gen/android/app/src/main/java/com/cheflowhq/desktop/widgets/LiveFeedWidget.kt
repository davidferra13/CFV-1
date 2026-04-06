package com.cheflowhq.desktop.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.cheflowhq.desktop.R

class LiveFeedWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_live_feed)

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/dashboard"))
            val pending = PendingIntent.getActivity(context, 40, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_feed_root, pending)

            if (!WidgetDataFetcher.isConfigured(context)) {
                views.setTextViewText(R.id.widget_feed_text, "Tap to set up ChefFlow")
                manager.updateAppWidget(widgetId, views)
                return
            }

            Thread {
                // Get recent events for a feed-like display
                val resp = WidgetDataFetcher.fetchJson(context, "/api/v2/events?per_page=5")
                val events = resp?.optJSONObject("data")?.optJSONArray("data")

                val items = mutableListOf<String>()
                if (events != null) {
                    for (i in 0 until minOf(events.length(), 5)) {
                        val e = events.optJSONObject(i)
                        val occasion = e?.optString("occasion", "") ?: ""
                        val status = e?.optString("status", "") ?: ""
                        if (occasion.isNotEmpty()) {
                            items.add("$occasion ($status)")
                        }
                    }
                }

                val feedText = if (items.isNotEmpty()) items.joinToString(" - ") else "No recent activity"
                views.setTextViewText(R.id.widget_feed_text, feedText)

                manager.updateAppWidget(widgetId, views)
            }.start()
        }
    }
}
