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

class DinnerCirclesWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_dinner_circles)

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/events"))
            val pending = PendingIntent.getActivity(context, 60, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_circles_root, pending)

            if (!WidgetDataFetcher.isConfigured(context)) {
                views.setTextViewText(R.id.widget_circles_empty, "Tap to set up ChefFlow")
                manager.updateAppWidget(widgetId, views)
                return
            }

            Thread {
                val resp = WidgetDataFetcher.fetchJson(context, "/api/v2/events?status=confirmed,accepted,paid&per_page=3")
                val events = resp?.optJSONObject("data")?.optJSONArray("data")
                val count = events?.length() ?: 0

                if (count > 0) {
                    views.setViewVisibility(R.id.widget_circles_empty, View.GONE)

                    val rowIds = intArrayOf(R.id.widget_circles_row1, R.id.widget_circles_row2, R.id.widget_circles_row3)
                    val nameIds = intArrayOf(R.id.widget_circles_name1, R.id.widget_circles_name2, R.id.widget_circles_name3)
                    val progressIds = intArrayOf(R.id.widget_circles_progress1, R.id.widget_circles_progress2, R.id.widget_circles_progress3)
                    val detailIds = intArrayOf(R.id.widget_circles_detail1, R.id.widget_circles_detail2, R.id.widget_circles_detail3)

                    for (i in 0 until minOf(count, 3)) {
                        val event = events?.optJSONObject(i)
                        val occasion = event?.optString("occasion", "Event") ?: "Event"
                        val guests = event?.optInt("guest_count", 0) ?: 0
                        val status = event?.optString("status", "") ?: ""
                        val date = event?.optString("event_date", "")?.take(10) ?: ""

                        views.setViewVisibility(rowIds[i], View.VISIBLE)
                        views.setTextViewText(nameIds[i], occasion)

                        // Simple progress estimate based on status
                        val progress = when (status) {
                            "draft" -> 10
                            "proposed" -> 25
                            "accepted" -> 45
                            "paid" -> 65
                            "confirmed" -> 80
                            "in_progress" -> 90
                            "completed" -> 100
                            else -> 0
                        }
                        views.setProgressBar(progressIds[i], 100, progress, false)

                        val detail = "$date${if (guests > 0) " - $guests guests" else ""} - $progress%"
                        views.setTextViewText(detailIds[i], detail)
                    }
                }

                manager.updateAppWidget(widgetId, views)
            }.start()
        }
    }
}
