package com.cheflowhq.desktop.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.cheflowhq.desktop.R

class TodayWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_today)

            if (!WidgetDataFetcher.isConfigured(context)) {
                views.setTextViewText(R.id.widget_today_events, "Tap to set up")
                views.setTextViewText(R.id.widget_today_tasks, "")
                views.setTextViewText(R.id.widget_today_next, "Open ChefFlow to configure")
                manager.updateAppWidget(widgetId, views)
                return
            }

            // Date header
            val dateFormat = SimpleDateFormat("EEE, MMM d", Locale.getDefault())
            views.setTextViewText(R.id.widget_today_date, dateFormat.format(Date()).uppercase())

            // Fetch data in background thread
            Thread {
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                val eventsResp = WidgetDataFetcher.fetchJson(context, "/api/v2/events?date_from=$today&date_to=$today")

                val events = eventsResp?.optJSONObject("data")?.optJSONArray("data")
                val eventCount = events?.length() ?: 0

                views.setTextViewText(R.id.widget_today_events, "$eventCount event${if (eventCount != 1) "s" else ""}")

                // Next event details
                if (eventCount > 0) {
                    val first = events?.optJSONObject(0)
                    val occasion = first?.optString("occasion", "Event") ?: "Event"
                    val time = first?.optString("serve_time", "") ?: ""
                    val guests = first?.optInt("guest_count", 0) ?: 0
                    val nextText = "$occasion${if (time.isNotEmpty()) " at $time" else ""}${if (guests > 0) " - $guests guests" else ""}"
                    views.setTextViewText(R.id.widget_today_next, "Next: $nextText")
                } else {
                    views.setTextViewText(R.id.widget_today_next, "No events today")
                }

                // Last updated timestamp
                val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
                views.setTextViewText(R.id.widget_today_updated, "Updated ${timeFormat.format(Date())}")

                // Tap opens dashboard
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/dashboard"))
                val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_today_root, pendingIntent)

                manager.updateAppWidget(widgetId, views)
            }.start()
        }
    }
}
