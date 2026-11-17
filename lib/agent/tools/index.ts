import "server-only";
import { createEvent, getAgenda, getSummary } from "@/lib/agent/tools/agenda";
import { findClients, getClient } from "@/lib/agent/tools/clients";
import { saveLibraryLink, saveReference, searchLibrary, searchReferences } from "@/lib/agent/tools/references";
import { createTask, findTasks, getTask, updateTask } from "@/lib/agent/tools/tasks";
import type { AgentTool } from "@/lib/agent/types";

export const AGENT_TOOLS: AgentTool[] = [
  getTask,
  findTasks,
  findClients,
  getClient,
  createTask,
  updateTask,
  saveReference,
  searchReferences,
  saveLibraryLink,
  searchLibrary,
  getAgenda,
  createEvent,
  getSummary,
];

export const toolByName = (name: string) => AGENT_TOOLS.find((t) => t.name === name) ?? null;
