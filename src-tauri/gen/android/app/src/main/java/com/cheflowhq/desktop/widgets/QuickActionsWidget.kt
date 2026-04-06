package com.cheflowhq.desktop.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.cheflowhq.desktop.R

class QuickActionsWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_quick_actions)

            // Note - opens dashboard Quick Notes
            val noteIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/dashboard"))
            views.setOnClickPendingIntent(R.id.widget_action_note,
                PendingIntent.getActivity(context, 10, noteIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))

            // New Event - opens event creation
            val eventIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/events/new"))
            views.setOnClickPendingIntent(R.id.widget_action_event,
                PendingIntent.getActivity(context, 11, eventIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))

            // Inbox - opens inbox
            val inboxIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://app.cheflowhq.com/inbox"))
            views.setOnClickPendingIntent(R.id.widget_action_inbox,
                PendingIntent.getActivity(context, 12, inboxIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
