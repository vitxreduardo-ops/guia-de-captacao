import "server-only";
import { findClients } from "@/lib/agent/tools/clients";
import { createTask, findTasks, getTask } from "@/lib/agent/tools/tasks";
import type { AgentTool } from "@/lib/agent/types";

export const AGENT_TOOLS: AgentTool[] = [getTask, findTasks, findClients, createTask];

export const toolByName = (name: string) => AGENT_TOOLS.find((t) => t.name === name) ?? null;
