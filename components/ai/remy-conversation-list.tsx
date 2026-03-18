'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import {
  getConversations,
  getArchivedConversations,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  updateConversation,
  deleteConversation,
  togglePin,
  toggleArchive,
  moveConversation,
  exportConversationMarkdown,
  exportConversationJSON,
  exportProjectJSON,
} from '@/lib/ai/remy-local-storage'
import type { LocalConversation } from '@/lib/ai/remy-local-storage'
import type { LocalProject } from '@/lib/ai/remy-types'
import {
  List,
  Pin,
  Archive,
  MoreHorizontal,
  FolderPlus,
  Trash2,
  Edit3,
  ArrowRight,
  Download,
  FileJson,
  ChevronDown,
  ChevronRight,
  Bookmark,
  Plus,
} from '@/components/ui/icons'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface RemyConversationListProps {
  onSelectConversation: (id: string) => void
  onNewConversation: (projectId?: string | null) => void
  currentConversationId?: string | null
}

export function RemyConversationList({
  onSelectConversation,
  onNewConversation,
  currentConversationId,
}: RemyConversationListProps) {
  const [conversations, setConversations] = useState<LocalConversation[]>([])
  const [archivedConversations, setArchivedConversations] = useState<LocalConversation[]>([])
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('remy-collapsed-projects')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [showArchived, setShowArchived] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    conversationId: string
  } | null>(null)
  const [projectContextMenu, setProjectContextMenu] = useState<{
    x: number
    y: number
    projectId: string
  } | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectIcon, setNewProjectIcon] = useState('📁')
  const [editingConversation, setEditingConversation] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null)
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    const [convs, archived, projs] = await Promise.all([
      getConversations(false),
      getArchivedConversations(),
      getProjects(),
    ])
    setConversations(convs)
    setArchivedConversations(archived)
    setProjects(projs)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('remy-collapsed-projects', JSON.stringify([...collapsedProjects]))
  }, [collapsedProjects])

  // Close context menus on outside click
  useEffect(() => {
    const handler = () => {
      setContextMenu(null)
      setProjectContextMenu(null)
      setShowMoveMenu(null)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const toggleCollapse = (projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, conversationId })
    setProjectContextMenu(null)
  }

  const handleProjectContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setProjectContextMenu({ x: e.clientX, y: e.clientY, projectId })
    setContextMenu(null)
  }

  const handlePin = async (id: string) => {
    await togglePin(id)
    setContextMenu(null)
    loadData()
  }

  const handleArchive = async (id: string) => {
    await toggleArchive(id)
    setContextMenu(null)
    loadData()
  }

  const handleDelete = (id: string) => {
    setDeleteConversationId(id)
    setContextMenu(null)
  }

  const handleConfirmedDeleteConversation = async () => {
    if (!deleteConversationId) return
    await deleteConversation(deleteConversationId)
    setDeleteConversationId(null)
    loadData()
  }

  const handleRename = (id: string) => {
    const conv =
      conversations.find((c) => c.id === id) || archivedConversations.find((c) => c.id === id)
    if (!conv) return
    setEditingConversation(id)
    setEditTitle(conv.title)
    setContextMenu(null)
  }

  const submitRename = async (id: string) => {
    if (editTitle.trim()) {
      await updateConversation(id, { title: editTitle.trim() })
    }
    setEditingConversation(null)
    loadData()
  }

  const handleMove = async (conversationId: string, targetProjectId: string | null) => {
    await moveConversation(conversationId, targetProjectId)
    setContextMenu(null)
    setShowMoveMenu(null)
    loadData()
  }

  const handleExportMarkdown = async (id: string) => {
    const md = await exportConversationMarkdown(id)
    if (!md) return
    const conv =
      conversations.find((c) => c.id === id) || archivedConversations.find((c) => c.id === id)
    const filename = `remy-${(conv?.title ?? 'conversation').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    downloadFile(filename, md, 'text/markdown')
    setContextMenu(null)
  }

  const handleExportJSON = async (id: string) => {
    const json = await exportConversationJSON(id)
    if (!json) return
    const conv =
      conversations.find((c) => c.id === id) || archivedConversations.find((c) => c.id === id)
    const filename = `remy-${(conv?.title ?? 'conversation').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
    downloadFile(filename, JSON.stringify(json, null, 2), 'application/json')
    setContextMenu(null)
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    await createProject(newProjectName.trim(), newProjectIcon)
    setShowNewProject(false)
    setNewProjectName('')
    setNewProjectIcon('📁')
    loadData()
  }

  const handleRenameProject = (id: string) => {
    const proj = projects.find((p) => p.id === id)
    if (!proj) return
    setEditingProject(id)
    setEditProjectName(proj.name)
    setProjectContextMenu(null)
  }

  const submitRenameProject = async (id: string) => {
    if (editProjectName.trim()) {
      await updateProject(id, { name: editProjectName.trim() })
    }
    setEditingProject(null)
    loadData()
  }

  const handleDeleteProject = (id: string) => {
    setDeleteProjectId(id)
    setProjectContextMenu(null)
  }

  const handleConfirmedDeleteProject = async () => {
    if (!deleteProjectId) return
    await deleteProject(deleteProjectId, null)
    setDeleteProjectId(null)
    loadData()
  }

  const handleExportProject = async (id: string) => {
    const json = await exportProjectJSON(id)
    if (!json) return
    const proj = projects.find((p) => p.id === id)
    const filename = `remy-project-${(proj?.name ?? 'project').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
    downloadFile(filename, JSON.stringify(json, null, 2), 'application/json')
    setProjectContextMenu(null)
  }

  // Group conversations by project
  const pinnedConversations = conversations.filter((c) => c.pinned)
  const projectGroups = projects
    .map((p) => ({
      project: p,
      conversations: conversations.filter((c) => !c.pinned && c.projectId === p.id),
    }))
    .filter((g) => g.conversations.length > 0)
  const uncategorized = conversations.filter((c) => !c.pinned && !c.projectId)

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d`
    return `${Math.floor(days / 30)}mo`
  }

  const ConversationItem = ({ conv }: { conv: LocalConversation }) => (
    <button
      onClick={() => onSelectConversation(conv.id)}
      onContextMenu={(e) => handleContextMenu(e, conv.id)}
      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 group transition-colors ${
        conv.id === currentConversationId
          ? 'bg-brand-500/20 text-white'
          : 'text-gray-300 hover:bg-white/5'
      }`}
    >
      {editingConversation === conv.id ? (
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={() => submitRename(conv.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename(conv.id)
            if (e.key === 'Escape') setEditingConversation(null)
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent border border-brand-500/40 rounded px-1 py-0.5 text-sm text-white outline-none"
        />
      ) : (
        <>
          {conv.pinned && <Pin className="w-3 h-3 text-brand-400 shrink-0" />}
          <span className="flex-1 truncate text-sm">{conv.title}</span>
          <span className="text-xxs text-gray-500 shrink-0">{timeAgo(conv.updatedAt)}</span>
          {conv.bookmarkCount > 0 && (
            <span className="flex items-center gap-0.5 text-xxs text-amber-400 shrink-0">
              <Bookmark className="w-2.5 h-2.5" />
              {conv.bookmarkCount}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleContextMenu(e, conv.id)
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-opacity"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </button>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <List className="w-4 h-4" />
          Conversations
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewProject(true)}
            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
            title="New project"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNewConversation(null)}
            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Project Dialog */}
      {showNewProject && (
        <div className="px-3 py-2 border-b border-white/10 bg-white/5">
          <div className="flex gap-2 mb-1">
            <input
              value={newProjectIcon}
              onChange={(e) => setNewProjectIcon(e.target.value)}
              className="w-10 text-center bg-transparent border border-white/20 rounded text-sm"
              maxLength={2}
            />
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject()
                if (e.key === 'Escape') setShowNewProject(false)
              }}
              placeholder="Project name..."
              className="flex-1 bg-transparent border border-white/20 rounded px-2 py-1 text-sm text-white placeholder-gray-500 outline-none focus:border-brand-500/50"
            />
          </div>
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => setShowNewProject(false)}
              className="px-2 py-0.5 text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              className="px-2 py-0.5 text-xs bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto px-1 py-1 space-y-1">
        {/* Pinned Section */}
        {pinnedConversations.length > 0 && (
          <div className="mb-2">
            <div className="px-2 py-1 text-xxs font-semibold uppercase tracking-wider text-gray-500">
              <Pin className="w-3 h-3 inline mr-1" />
              Pinned
            </div>
            {pinnedConversations.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))}
          </div>
        )}

        {/* Project Groups */}
        {projectGroups.map(({ project, conversations: projConvs }) => (
          <div key={project.id} className="mb-1">
            <div
              className="flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-white/5 rounded group"
              onClick={() => toggleCollapse(project.id)}
              onContextMenu={(e) => handleProjectContextMenu(e, project.id)}
            >
              {collapsedProjects.has(project.id) ? (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              )}
              {editingProject === project.id ? (
                <input
                  autoFocus
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  onBlur={() => submitRenameProject(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRenameProject(project.id)
                    if (e.key === 'Escape') setEditingProject(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent border border-brand-500/40 rounded px-1 py-0.5 text-xs text-white outline-none"
                />
              ) : (
                <>
                  <span className="text-sm">{project.icon}</span>
                  <span className="flex-1 text-xs font-medium text-gray-300 truncate">
                    {project.name}
                  </span>
                  <span className="text-xxs text-gray-600">{projConvs.length}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleProjectContextMenu(e, project.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-opacity"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            {!collapsedProjects.has(project.id) && (
              <div className="ml-2">
                {projConvs.map((conv) => (
                  <ConversationItem key={conv.id} conv={conv} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <div className="mb-2">
            <div className="px-2 py-1 text-xxs font-semibold uppercase tracking-wider text-gray-500">
              Uncategorized
            </div>
            {uncategorized.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} />
            ))}
          </div>
        )}

        {/* Archived Section */}
        {archivedConversations.length > 0 && (
          <div className="mt-2 border-t border-white/5 pt-1">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-1 px-2 py-1 w-full text-left hover:bg-white/5 rounded"
            >
              {showArchived ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-500" />
              )}
              <Archive className="w-3 h-3 text-gray-500" />
              <span className="text-xxs font-semibold uppercase tracking-wider text-gray-500">
                Archived ({archivedConversations.length})
              </span>
            </button>
            {showArchived &&
              archivedConversations.map((conv) => <ConversationItem key={conv.id} conv={conv} />)}
          </div>
        )}

        {/* Empty State */}
        {conversations.length === 0 && archivedConversations.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No conversations yet. Start one with Remy!
          </div>
        )}
      </div>

      {/* Context Menu - Conversation */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-gray-800 border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 300),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem
            icon={<Edit3 className="w-3.5 h-3.5" />}
            label="Rename"
            onClick={() => handleRename(contextMenu.conversationId)}
          />
          <ContextMenuItem
            icon={<ArrowRight className="w-3.5 h-3.5" />}
            label="Move to..."
            onClick={() => setShowMoveMenu(contextMenu.conversationId)}
          />
          {showMoveMenu === contextMenu.conversationId && (
            <div className="border-t border-b border-white/5 py-1 mx-2 my-1">
              <button
                onClick={() => handleMove(contextMenu.conversationId, null)}
                className="w-full text-left px-3 py-1 text-xs text-gray-400 hover:bg-white/5 rounded"
              >
                Uncategorized
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleMove(contextMenu.conversationId, p.id)}
                  className="w-full text-left px-3 py-1 text-xs text-gray-300 hover:bg-white/5 rounded"
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          )}
          <ContextMenuItem
            icon={<Pin className="w-3.5 h-3.5" />}
            label={
              conversations.find((c) => c.id === contextMenu.conversationId)?.pinned
                ? 'Unpin'
                : 'Pin'
            }
            onClick={() => handlePin(contextMenu.conversationId)}
          />
          <div className="border-t border-white/5 my-1" />
          <ContextMenuItem
            icon={<Download className="w-3.5 h-3.5" />}
            label="Export Markdown"
            onClick={() => handleExportMarkdown(contextMenu.conversationId)}
          />
          <ContextMenuItem
            icon={<FileJson className="w-3.5 h-3.5" />}
            label="Export JSON"
            onClick={() => handleExportJSON(contextMenu.conversationId)}
          />
          <div className="border-t border-white/5 my-1" />
          <ContextMenuItem
            icon={<Archive className="w-3.5 h-3.5" />}
            label={
              conversations.find((c) => c.id === contextMenu.conversationId)?.archived
                ? 'Unarchive'
                : 'Archive'
            }
            onClick={() => handleArchive(contextMenu.conversationId)}
          />
          <ContextMenuItem
            icon={<Trash2 className="w-3.5 h-3.5" />}
            label="Delete"
            onClick={() => handleDelete(contextMenu.conversationId)}
            danger
          />
        </div>
      )}

      {/* Context Menu - Project */}
      {projectContextMenu && (
        <div
          className="fixed z-50 bg-gray-800 border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: Math.min(projectContextMenu.x, window.innerWidth - 200),
            top: Math.min(projectContextMenu.y, window.innerHeight - 200),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem
            icon={<Plus className="w-3.5 h-3.5" />}
            label="New conversation here"
            onClick={() => {
              onNewConversation(projectContextMenu.projectId)
              setProjectContextMenu(null)
            }}
          />
          <ContextMenuItem
            icon={<Edit3 className="w-3.5 h-3.5" />}
            label="Rename project"
            onClick={() => handleRenameProject(projectContextMenu.projectId)}
          />
          <ContextMenuItem
            icon={<FileJson className="w-3.5 h-3.5" />}
            label="Export all"
            onClick={() => handleExportProject(projectContextMenu.projectId)}
          />
          <div className="border-t border-white/5 my-1" />
          <ContextMenuItem
            icon={<Trash2 className="w-3.5 h-3.5" />}
            label="Delete project"
            onClick={() => handleDeleteProject(projectContextMenu.projectId)}
            danger
          />
        </div>
      )}

      <ConfirmModal
        open={deleteConversationId !== null}
        title="Delete this conversation?"
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmedDeleteConversation}
        onCancel={() => setDeleteConversationId(null)}
      />

      <ConfirmModal
        open={deleteProjectId !== null}
        title="Delete this project?"
        description="Conversations will be moved to Uncategorized."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmedDeleteProject}
        onCancel={() => setDeleteProjectId(null)}
      />
    </div>
  )
}

function ContextMenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
