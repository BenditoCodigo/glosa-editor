import type { PluginListenerHandle } from '@capacitor/core';

export interface DirEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface StatResult {
  isDirectory: boolean;
  isFile: boolean;
  mtime?: number;
  size?: number;
}

export interface FsChangeEvent {
  watchId: string;
  type: string;
  path: string;
}

export interface AiStreamChunkEvent {
  streamId: string;
  chunk?: string;
  error?: string;
  status?: number;
  done: boolean;
}

export interface GlosaDesktopPlugin {
  pickDirectory(): Promise<{ path: string | null }>;
  readTextFile(options: { path: string }): Promise<{ data: string }>;
  writeTextFile(options: { path: string; data: string }): Promise<Record<string, never>>;
  readDir(options: { path: string }): Promise<{ entries: DirEntry[] }>;
  mkdir(options: { path: string; recursive?: boolean }): Promise<Record<string, never>>;
  remove(options: { path: string; recursive?: boolean }): Promise<Record<string, never>>;
  rename(options: { oldPath: string; newPath: string }): Promise<Record<string, never>>;
  exists(options: { path: string }): Promise<{ exists: boolean }>;
  stat(options: { path: string }): Promise<StatResult>;
  startWatch(options: { path: string }): Promise<{ watchId: string }>;
  stopWatch(options: { watchId: string }): Promise<Record<string, never>>;
  openUrl(options: { url: string }): Promise<Record<string, never>>;
  aiFetch(options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }): Promise<{
    status: number;
    ok: boolean;
    statusText: string;
    headers: Record<string, string>;
    data: string;
  }>;
  aiStream(options: {
    streamId: string;
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{ status: number; ok: boolean }>;
  aiStreamCancel(options: { streamId: string }): Promise<Record<string, never>>;
  addListener(
    eventName: 'fsChange',
    listenerFunc: (event: FsChangeEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'aiStreamChunk',
    listenerFunc: (event: AiStreamChunkEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export declare const GlosaDesktop: GlosaDesktopPlugin;
