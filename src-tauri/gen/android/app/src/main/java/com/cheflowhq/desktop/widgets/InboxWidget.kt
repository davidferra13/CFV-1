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

class InboxWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_inbox)

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/inbox"))
            val pending = PendingIntent.getActivity(context, 50, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_inbox_root, pending)

            if (!WidgetDataFetcher.isConfigured(context)) {
                views.setTextViewText(R.id.widget_inbox_empty, "Tap to set up ChefFlow")
                manager.updateAppWidget(widgetId, views)
                return
            }

            Thread {
                val resp = WidgetDataFetcher.fetchJson(context, "/api/v2/inquiries?status=new&per_page=3")
                val inquiries = resp?.optJSONObject("data")?.optJSONArray("data")
                val count = inquiries?.length() ?: 0

                if (count > 0) {
                    views.setViewVisibility(R.id.widget_inbox_empty, View.GONE)
                    views.setTextViewText(R.id.widget_inbox_count, "$count")

                    val titleIds = intArrayOf(R.id.widget_inbox_item1_title, R.id.widget_inbox_item2_title, R.id.widget_inbox_item3_title)
                    val previewIds = intArrayOf(R.id.widget_inbox_item1_preview, R.id.widget_inbox_item2_preview, R.id.widget_inbox_item3_preview)
                    val dividerIds = intArrayOf(R.id.widget_inbox_divider1, R.id.widget_inbox_divider2)

                    for (i in 0 until minOf(count, 3)) {
                        val inq = inquiries?.optJSONObject(i)
                        val name = inq?.optString("client_name", "Unknown") ?: "Unknown"
                        val occasion = inq?.optString("occasion", "") ?: ""

                        views.setTextViewText(titleIds[i], name)
                        views.setViewVisibility(titleIds[i], View.VISIBLE)
                        views.setTextViewText(previewIds[i], if (occasion.isNotEmpty()) occasion else "New inquiry")
                        views.setViewVisibility(previewIds[i], View.VISIBLE)

                        if (i < dividerIds.size && i < count - 1) {
                            views.setViewVisibility(dividerIds[i], View.VISIBLE)
                        }
                    }
                }

                manager.updateAppWidget(widgetId, views)
            }.start()
        }
    }
}
