package com.cheflowhq.desktop.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.cheflowhq.desktop.R
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class WeekGlanceWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        private val DAY_LABELS = intArrayOf(
            R.id.widget_week_d0_label, R.id.widget_week_d1_label, R.id.widget_week_d2_label,
            R.id.widget_week_d3_label, R.id.widget_week_d4_label, R.id.widget_week_d5_label,
            R.id.widget_week_d6_label
        )
        private val DAY_COUNTS = intArrayOf(
            R.id.widget_week_d0_count, R.id.widget_week_d1_count, R.id.widget_week_d2_count,
            R.id.widget_week_d3_count, R.id.widget_week_d4_count, R.id.widget_week_d5_count,
            R.id.widget_week_d6_count
        )

        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_week_glance)

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/calendar"))
            val pending = PendingIntent.getActivity(context, 30, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_week_root, pending)

            // Set day labels
            val cal = Calendar.getInstance()
            val dayFmt = SimpleDateFormat("EEE", Locale.getDefault())
            val dateFmt = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

            // Start from today
            val startDate = dateFmt.format(cal.time)
            for (i in 0..6) {
                views.setTextViewText(DAY_LABELS[i], dayFmt.format(cal.time).uppercase().take(3))
                views.setTextViewText(DAY_COUNTS[i], ".")
                cal.add(Calendar.DAY_OF_YEAR, 1)
            }
            val endDate = dateFmt.format(cal.time)

            if (!WidgetDataFetcher.isConfigured(context)) {
                views.setTextViewText(R.id.widget_week_summary, "Tap to set up")
                manager.updateAppWidget(widgetId, views)
                return
            }

            Thread {
                val resp = WidgetDataFetcher.fetchJson(context, "/api/v2/events?date_from=$startDate&date_to=$endDate&per_page=100")
                val events = resp?.optJSONObject("data")?.optJSONArray("data")
                val total = events?.length() ?: 0

                // Count events per day
                val counts = IntArray(7)
                if (events != null) {
                    for (j in 0 until events.length()) {
                        val event = events.optJSONObject(j)
                        val eventDate = event?.optString("event_date", "") ?: ""
                        // Match to day index
                        val checkCal = Calendar.getInstance()
                        for (d in 0..6) {
                            checkCal.time = Calendar.getInstance().apply {
                                add(Calendar.DAY_OF_YEAR, d)
                            }.time
                            if (eventDate.startsWith(dateFmt.format(checkCal.time))) {
                                counts[d]++
                            }
                        }
                    }
                }

                for (i in 0..6) {
                    views.setTextViewText(DAY_COUNTS[i], if (counts[i] > 0) "${counts[i]}" else ".")
                }
                views.setTextViewText(R.id.widget_week_summary, "$total events this week")

                manager.updateAppWidget(widgetId, views)
            }.start()
        }
    }
}
