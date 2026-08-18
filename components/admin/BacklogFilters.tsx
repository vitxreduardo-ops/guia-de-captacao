"use client";

import { useRef } from "react";
import { UserInitials } from "@/components/admin/UserInitials";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BACKLOG_CARD_STATUS_LABELS,
  BACKLOG_DATE_BUCKET_LABELS,
  BACKLOG_FORMATS,
  BACKLOG_FORMAT_LABELS,
  EMPTY_BACKLOG_FILTER,
  countBacklogFilters,
  type BacklogCardStatus,
  type BacklogClientOption,
  type BacklogDateBucket,
  type BacklogFilter,
  type BacklogFormat,
  type BacklogUserOption,
} from "@/lib/backlogTypes";

const sectionClass = "mb-1.5 text-xs font-semibold text-neutral-500";

/** Liga/desliga um valor numa das listas do filtro. */
function toggle<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function CheckRow({
  checked,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  label: string;
  hint?: React.ReactNode;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-neutral-800 hover:bg-neutral-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0"
      />
      {hint}
      <span className="truncate">{label}</span>
    </label>
  );
}

export function BacklogFilters({
  filter,
  onChange,
  clients,
  users,
  align = "start",
}: {
  filter: BacklogFilter;
  onChange: (next: BacklogFilter) => void;
  clients: BacklogClientOption[];
  users: BacklogUserOption[];
  /** Borda do grupo que fica parada quando o "limpar" entra: "start" quando
   *  os botões estão à esquerda da barra, "end" quando estão à direita. */
  align?: "start" | "end";
}) {
  const count = countBacklogFilters(filter);
  const groupRef = useRef<HTMLDivElement>(null);

  return (
    <Popover>
      <div ref={groupRef} className="flex items-center">
        <PopoverTrigger
          render={
            <button
              type="button"
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                count > 0
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              Filtro
              {count > 0 ? (
                <span className="rounded-full bg-white px-1.5 text-xs font-medium text-neutral-900">
                  {count}
                </span>
              ) : null}
            </button>
          }
        />

        {/* O botão de limpar entra abrindo espaço à direita, o que empurra o
            "Filtro" pra esquerda. A largura é animada em vez de montar/
            desmontar o nó, senão não haveria transição. */}
        <div
          className={`overflow-hidden transition-[max-width,margin,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            count > 0 ? "ml-2 max-w-10 opacity-100" : "ml-0 max-w-0 opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={() => onChange(EMPTY_BACKLOG_FILTER)}
            aria-label="Limpar filtro"
            tabIndex={count > 0 ? 0 : -1}
            className={`flex size-8 items-center justify-center rounded-md bg-neutral-900 text-sm text-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-neutral-700 motion-reduce:transition-none ${
              count > 0 ? "scale-100" : "scale-75"
            }`}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Ancorado no grupo inteiro, e não no gatilho: assim o painel fica
          parado quando o botão "limpar" entra e desloca os botões. */}
      <PopoverContent
        anchor={groupRef}
        align={align}
        className="max-h-[70vh] w-80 overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-900">Filtro</p>
          {count > 0 ? (
            <button
              type="button"
              onClick={() => onChange(EMPTY_BACKLOG_FILTER)}
              className="text-xs text-neutral-500 hover:text-neutral-900"
            >
              Limpar
            </button>
          ) : null}
        </div>

        <div>
          <p className={sectionClass}>Palavra-chave</p>
          <input
            value={filter.keyword}
            onChange={(event) =>
              onChange({ ...filter, keyword: event.target.value })
            }
            placeholder="Insira uma palavra-chave..."
            className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Busca no título, na legenda, nas observações e nas tags.
          </p>
        </div>

        <div>
          <p className={sectionClass}>Responsável</p>
          <CheckRow
            checked={filter.assignees.includes("none")}
            label="Sem responsável"
            onChange={() =>
              onChange({
                ...filter,
                assignees: toggle(filter.assignees, "none"),
              })
            }
          />
          {users.map((user) => (
            <CheckRow
              key={user.id}
              checked={filter.assignees.includes(user.id)}
              label={user.username}
              hint={<UserInitials username={user.username} />}
              onChange={() =>
                onChange({
                  ...filter,
                  assignees: toggle(filter.assignees, user.id),
                })
              }
            />
          ))}
        </div>

        <div>
          <p className={sectionClass}>Cliente</p>
          <CheckRow
            checked={filter.clients.includes("none")}
            label="Sem cliente"
            onChange={() =>
              onChange({ ...filter, clients: toggle(filter.clients, "none") })
            }
          />
          {clients.map((client) => (
            <CheckRow
              key={client.id}
              checked={filter.clients.includes(client.id)}
              label={client.name}
              onChange={() =>
                onChange({
                  ...filter,
                  clients: toggle(filter.clients, client.id),
                })
              }
            />
          ))}
        </div>

        <div>
          <p className={sectionClass}>Formato</p>
          {BACKLOG_FORMATS.map((format) => (
            <CheckRow
              key={format}
              checked={filter.formats.includes(format)}
              label={BACKLOG_FORMAT_LABELS[format]}
              onChange={() =>
                onChange({
                  ...filter,
                  formats: toggle<BacklogFormat>(filter.formats, format),
                })
              }
            />
          ))}
        </div>

        <div>
          <p className={sectionClass}>Data de post</p>
          {(
            Object.keys(BACKLOG_DATE_BUCKET_LABELS) as BacklogDateBucket[]
          ).map((bucket) => (
            <CheckRow
              key={bucket}
              checked={filter.dates.includes(bucket)}
              label={BACKLOG_DATE_BUCKET_LABELS[bucket]}
              onChange={() =>
                onChange({
                  ...filter,
                  dates: toggle<BacklogDateBucket>(filter.dates, bucket),
                })
              }
            />
          ))}
        </div>

        <div>
          <p className={sectionClass}>Status</p>
          {(
            Object.keys(BACKLOG_CARD_STATUS_LABELS) as BacklogCardStatus[]
          ).map((status) => (
            <CheckRow
              key={status}
              checked={filter.statuses.includes(status)}
              label={BACKLOG_CARD_STATUS_LABELS[status]}
              onChange={() =>
                onChange({
                  ...filter,
                  statuses: toggle<BacklogCardStatus>(filter.statuses, status),
                })
              }
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
