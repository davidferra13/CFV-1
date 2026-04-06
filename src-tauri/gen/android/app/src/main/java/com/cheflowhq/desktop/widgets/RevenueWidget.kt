package com.cheflowhq.desktop.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.cheflowhq.desktop.R
import java.text.NumberFormat
import java.util.Locale

class RevenueWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    companion object {
        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_revenue)

            // Tap opens financial reports
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/reports"))
            val pending = PendingIntent.getActivity(context, 20, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_revenue_root, pending)

            if (!WidgetDataFetcher.isConfigured(context)) {
                views.setTextViewText(R.id.widget_revenue_amount, "Set up")
                manager.updateAppWidget(widgetId, views)
                return
            }

            Thread {
                val resp = WidgetDataFetcher.fetchJson(context, "/api/v2/financials/summary")
                val data = resp?.optJSONObject("data")

                if (data != null) {
                    val revenueCents = data.optLong("totalRevenueCents", 0)
                    val fmt = NumberFormat.getCurrencyInstance(Locale.US)
                    fmt.maximumFractionDigits = 0
                    views.setTextViewText(R.id.widget_revenue_amount, fmt.format(revenueCents / 100.0))
                } else {
                    views.setTextViewText(R.id.widget_revenue_amount, "--")
                }

                manager.updateAppWidget(widgetId, views)
            }.start()
        }
    }
}
