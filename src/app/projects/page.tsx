'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Folder,
  Music2,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { TrackCard } from '@/components/studio/TrackCard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  getUserProjects,
  saveProject,
  deleteProject,
  getUserTracks,
} from '@/lib/firestore-service';
import { StudioProject, GeneratedTrack } from '@/types';
import { generateId, formatDate } from '@/lib/utils';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Modal / Create state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectGenre, setNewProjectGenre] = useState('Cinematic');

  const uid = user ? user.uid : 'guest';

  const loadData = async () => {
    const [userProjects, userTracks] = await Promise.all([
      getUserProjects(uid),
      getUserTracks(uid),
    ]);
    setProjects(userProjects);
    setTracks(userTracks);
    if (userProjects.length > 0 && !activeProjectId) {
      setActiveProjectId(userProjects[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      warning('Project Name Required', 'Please enter a name for your new project.');
      return;
    }

    const newProj: StudioProject = {
      id: generateId('proj'),
      userId: uid,
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      genre: newProjectGenre,
      trackCount: 0,
      sfxCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
    };

    await saveProject(newProj);
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setShowCreateModal(false);
    setNewProjectName('');
    setNewProjectDesc('');
    success('Project Created', `"${newProj.name}" is ready.`);
  };

  const handleDeleteProject = async (projId: string, name: string) => {
    if (confirm(`Delete project "${name}"? Tracks will not be deleted from your general library.`)) {
      await deleteProject(projId, uid);
      setProjects((prev) => prev.filter((p) => p.id !== projId));
      if (activeProjectId === projId) {
        setActiveProjectId(null);
      }
      success('Project Deleted', 'Project removed successfully.');
    }
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectTracks = tracks.filter((t) => t.projectId === activeProjectId);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-studio-violet" />
              Studio Projects
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Group and structure music generations for film cues, game levels, podcasts, and albums.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-gradient-to-r from-studio-violet to-studio-blue text-white text-xs font-semibold shadow-md shadow-studio-violet/20 hover:opacity-95 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {/* Project Selector Cards */}
        {projects.length === 0 ? (
          <div className="p-12 rounded-2xl bg-midnight-900/50 border border-studio-border/50 text-center space-y-3">
            <FolderOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No projects yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first project to organize related music tracks and sound effects.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-studio-violet text-white text-xs font-semibold shadow-md hover:bg-violet-600 transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const count = tracks.filter((t) => t.projectId === proj.id).length;
              return (
                <div
                  key={proj.id}
                  onClick={() => setActiveProjectId(proj.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isActive
                      ? 'bg-midnight-850 border-studio-violet shadow-lg shadow-studio-violet/10'
                      : 'bg-midnight-900/70 hover:bg-midnight-850 border-studio-border hover:border-studio-violet/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Folder className={`w-4 h-4 ${isActive ? 'text-studio-cyan' : 'text-slate-400'}`} />
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                          {proj.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(proj.id, proj.name);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {proj.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {proj.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300">
                      {count} {count === 1 ? 'track' : 'tracks'}
                    </span>
                    <span>{formatDate(proj.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Project Content */}
        {activeProject && (
          <div className="mt-8 space-y-4">
            <div className="p-5 rounded-2xl bg-midnight-900/80 border border-studio-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📁 {activeProject.name}</span>
                </h2>
                {activeProject.description && (
                  <p className="text-xs text-slate-400 mt-1">{activeProject.description}</p>
                )}
              </div>
              <Link
                href="/studio"
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-studio-blue hover:bg-blue-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate for this Project</span>
              </Link>
            </div>

            {projectTracks.length === 0 ? (
              <div className="p-8 rounded-2xl bg-midnight-900/40 border border-studio-border/40 text-center space-y-2">
                <Music2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  No tracks assigned to this project yet. In the Studio or Library, select &quot;{activeProject.name}&quot; when generating or moving a track.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectTracks.map((track) => (
                  <TrackCard key={track.id} track={track} projects={projects} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-midnight-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-midnight-900 border border-studio-border p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-studio-violet" />
                Create New Studio Project
              </h3>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cyberpunk Film Score 2026"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-studio-violet"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of project themes, video cues, or game levels..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-midnight-950 border border-studio-border text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-studio-violet resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-studio-violet to-studio-blue text-white text-xs font-semibold shadow-md hover:opacity-95 transition-opacity"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

