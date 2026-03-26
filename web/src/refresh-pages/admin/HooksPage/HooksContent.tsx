"use client";

import { useState, useEffect } from "react";
import { toast } from "@/hooks/useToast";
import { useHookSpecs } from "@/hooks/useHookSpecs";
import { useHooks } from "@/hooks/useHooks";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";
import { Button } from "@opal/components";
import { Disabled } from "@opal/core";
import { cn } from "@/lib/utils";
import { ContentAction } from "@opal/layouts";
import InputSearch from "@/refresh-components/inputs/InputSearch";
import Card from "@/refresh-components/cards/Card";
import Text from "@/refresh-components/texts/Text";
import { Section } from "@/layouts/general-layouts";
import {
  SvgArrowExchange,
  SvgBubbleText,
  SvgCheckCircle,
  SvgExternalLink,
  SvgFileBroadcast,
  SvgHookNodes,
  SvgPlug,
  SvgRefreshCw,
  SvgSettings,
  SvgTrash,
  SvgUnplug,
} from "@opal/icons";
import { IconFunctionComponent } from "@opal/types";
import HookFormModal from "@/refresh-pages/admin/HooksPage/HookFormModal";
import Modal, { BasicModalFooter } from "@/refresh-components/Modal";
import type {
  HookPointMeta,
  HookResponse,
} from "@/refresh-pages/admin/HooksPage/interfaces";
import {
  activateHook,
  deactivateHook,
  deleteHook,
  validateHook,
} from "@/refresh-pages/admin/HooksPage/svc";

const HOOK_POINT_ICONS: Record<string, IconFunctionComponent> = {
  document_ingestion: SvgFileBroadcast,
  query_processing: SvgBubbleText,
};

function getHookPointIcon(hookPoint: string): IconFunctionComponent {
  return HOOK_POINT_ICONS[hookPoint] ?? SvgHookNodes;
}

// ---------------------------------------------------------------------------
// Sub-component: disconnect confirmation modal
// ---------------------------------------------------------------------------

interface DisconnectConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hook: HookResponse;
  onDisconnect: () => void;
  onDisconnectAndDelete: () => void;
}

function DisconnectConfirmModal({
  open,
  onOpenChange,
  hook,
  onDisconnect,
  onDisconnectAndDelete,
}: DisconnectConfirmModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Content width="md" height="fit">
        <Modal.Header
          icon={(props) => (
            <SvgUnplug {...props} className="text-action-danger-05" />
          )}
          title={`Disconnect ${hook.name}`}
          onClose={() => onOpenChange(false)}
        />
        <Modal.Body>
          <div className="flex flex-col gap-4">
            <Text mainUiBody text03>
              Onyx will stop calling this endpoint for hook{" "}
              <strong>
                <em>{hook.name}</em>
              </strong>
              . In-flight requests will continue to run. The external endpoint
              may still retain data previously sent to it. You can reconnect
              this hook later if needed.
            </Text>
            <Text mainUiBody text03>
              You can also delete this hook. Deletion cannot be undone.
            </Text>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <BasicModalFooter
            cancel={
              <Button
                prominence="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            }
            submit={
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  prominence="secondary"
                  onClick={onDisconnectAndDelete}
                >
                  Disconnect &amp; Delete
                </Button>
                <Button
                  variant="danger"
                  prominence="primary"
                  onClick={onDisconnect}
                >
                  Disconnect
                </Button>
              </div>
            }
          />
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: delete confirmation modal
// ---------------------------------------------------------------------------

interface DeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hook: HookResponse;
  onDelete: () => void;
}

function DeleteConfirmModal({
  open,
  onOpenChange,
  hook,
  onDelete,
}: DeleteConfirmModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Content width="md" height="fit">
        <Modal.Header
          icon={(props) => (
            <SvgTrash {...props} className="text-action-danger-05" />
          )}
          title={`Delete ${hook.name}`}
          onClose={() => onOpenChange(false)}
        />
        <Modal.Body>
          <div className="flex flex-col gap-4">
            <Text mainUiBody text03>
              Hook{" "}
              <strong>
                <em>{hook.name}</em>
              </strong>{" "}
              will be permanently removed from this hook point. The external
              endpoint may still retain data previously sent to it.
            </Text>
            <Text mainUiBody text03>
              Deletion cannot be undone.
            </Text>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <BasicModalFooter
            cancel={
              <Button
                prominence="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            }
            submit={
              <Button variant="danger" prominence="primary" onClick={onDelete}>
                Delete
              </Button>
            }
          />
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: connected hook card
// ---------------------------------------------------------------------------

interface ConnectedHookCardProps {
  hook: HookResponse;
  spec: HookPointMeta | undefined;
  onEdit: () => void;
  onDeleted: () => void;
  onToggled: (updated: HookResponse) => void;
}

function ConnectedHookCard({
  hook,
  spec,
  onEdit,
  onDeleted,
  onToggled,
}: ConnectedHookCardProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  async function handleDelete() {
    setDeleteConfirmOpen(false);
    setIsBusy(true);
    try {
      await deleteHook(hook.id);
      onDeleted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete hook."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleActivate() {
    setIsBusy(true);
    try {
      const updated = await activateHook(hook.id);
      onToggled(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reconnect hook."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeactivate() {
    setDisconnectConfirmOpen(false);
    setIsBusy(true);
    try {
      const updated = await deactivateHook(hook.id);
      onToggled(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate hook."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDisconnectAndDelete() {
    setDisconnectConfirmOpen(false);
    setIsBusy(true);
    try {
      await deactivateHook(hook.id);
      await deleteHook(hook.id);
      onDeleted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disconnect hook."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleValidate() {
    setIsBusy(true);
    try {
      await validateHook(hook.id);
      toast.success("Hook validated successfully.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to validate hook."
      );
    } finally {
      setIsBusy(false);
    }
  }

  const HookIcon = getHookPointIcon(hook.hook_point);

  return (
    <>
      <DisconnectConfirmModal
        open={disconnectConfirmOpen}
        onOpenChange={setDisconnectConfirmOpen}
        hook={hook}
        onDisconnect={handleDeactivate}
        onDisconnectAndDelete={handleDisconnectAndDelete}
      />
      <DeleteConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        hook={hook}
        onDelete={handleDelete}
      />
      <Card
        variant="primary"
        padding={0.5}
        gap={0}
        className={cn(
          "hover:border-border-02",
          !hook.is_active && "!bg-background-neutral-02"
        )}
      >
        <ContentAction
          sizePreset="main-ui"
          variant="section"
          paddingVariant="sm"
          icon={HookIcon}
          title={hook.name}
          titleClassName={!hook.is_active ? "line-through" : undefined}
          iconClassName="text-text-04"
          description={`Hook Point: ${spec?.display_name ?? hook.hook_point}`}
          bottomChildren={
            spec?.docs_url ? (
              <a
                href={spec.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 w-fit font-secondary-body text-text-03"
              >
                <span className="underline">Documentation</span>
                <SvgExternalLink size={12} className="shrink-0" />
              </a>
            ) : undefined
          }
          rightChildren={
            <Section
              flexDirection="column"
              alignItems="end"
              width="fit"
              height="fit"
              gap={0}
            >
              <div className="flex items-center gap-1 p-2">
                {hook.is_active ? (
                  <>
                    <Text mainUiAction text03>
                      Connected
                    </Text>
                    <SvgCheckCircle
                      size={16}
                      className="text-status-success-05"
                    />
                  </>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      isBusy
                        ? "opacity-50 pointer-events-none"
                        : "cursor-pointer"
                    )}
                    onClick={handleActivate}
                  >
                    <Text mainUiAction text03>
                      Reconnect
                    </Text>
                    <SvgPlug size={16} className="text-text-03 shrink-0" />
                  </div>
                )}
              </div>
              <Disabled disabled={isBusy}>
                {/* Plain div instead of Section: Section applies style={{ padding }} inline which
                    overrides Tailwind padding classes, making per-side padding (pl/pr/pb) ineffective. */}
                <div className="flex items-center gap-0.5 pl-1 pr-1 pb-1">
                  {hook.is_active ? (
                    <>
                      <Button
                        prominence="tertiary"
                        size="sm"
                        icon={SvgUnplug}
                        onClick={() => setDisconnectConfirmOpen(true)}
                        tooltip="Disconnect Hook"
                        aria-label="Deactivate hook"
                      />
                      <Button
                        prominence="tertiary"
                        size="sm"
                        icon={SvgRefreshCw}
                        onClick={handleValidate}
                        tooltip="Test Connection"
                        aria-label="Re-validate hook"
                      />
                    </>
                  ) : (
                    <Button
                      prominence="tertiary"
                      size="sm"
                      icon={SvgTrash}
                      onClick={() => setDeleteConfirmOpen(true)}
                      tooltip="Delete"
                      aria-label="Delete hook"
                    />
                  )}
                  <Button
                    prominence="tertiary"
                    size="sm"
                    icon={SvgSettings}
                    onClick={onEdit}
                    tooltip="Manage"
                    aria-label="Configure hook"
                  />
                </div>
              </Disabled>
            </Section>
          }
        />
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HooksContent() {
  const [search, setSearch] = useState("");
  const [connectSpec, setConnectSpec] = useState<HookPointMeta | null>(null);
  const [editHook, setEditHook] = useState<HookResponse | null>(null);

  const { specs, isLoading: specsLoading, error: specsError } = useHookSpecs();
  const {
    hooks,
    isLoading: hooksLoading,
    error: hooksError,
    mutate,
  } = useHooks();

  useEffect(() => {
    if (specsError) toast.error("Failed to load hook specifications.");
  }, [specsError]);

  useEffect(() => {
    if (hooksError) toast.error("Failed to load hooks.");
  }, [hooksError]);

  if (specsLoading || hooksLoading) {
    return <SimpleLoader />;
  }

  if (specsError) {
    return (
      <Text text03 secondaryBody>
        Failed to load hook specifications. Please refresh the page.
      </Text>
    );
  }

  const hooksByPoint: Record<string, HookResponse[]> = {};
  for (const hook of hooks ?? []) {
    (hooksByPoint[hook.hook_point] ??= []).push(hook);
  }

  const searchLower = search.toLowerCase();

  // Connected hooks sorted alphabetically by hook name
  const connectedHooks = (hooks ?? [])
    .filter(
      (hook) =>
        !searchLower ||
        hook.name.toLowerCase().includes(searchLower) ||
        specs
          ?.find((s) => s.hook_point === hook.hook_point)
          ?.display_name.toLowerCase()
          .includes(searchLower)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Unconnected hook point specs sorted alphabetically
  const unconnectedSpecs = (specs ?? [])
    .filter(
      (spec) =>
        (hooksByPoint[spec.hook_point]?.length ?? 0) === 0 &&
        (!searchLower ||
          spec.display_name.toLowerCase().includes(searchLower) ||
          spec.description.toLowerCase().includes(searchLower))
    )
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  function handleHookSuccess(updated: HookResponse) {
    mutate((prev) => {
      if (!prev) return [updated];
      const idx = prev.findIndex((h) => h.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }

  function handleHookDeleted(id: number) {
    mutate((prev) => prev?.filter((h) => h.id !== id));
  }

  const connectSpec_ =
    connectSpec ??
    (editHook
      ? specs?.find((s) => s.hook_point === editHook.hook_point)
      : undefined);

  return (
    <>
      <div className="flex flex-col gap-6">
        <InputSearch
          placeholder="Search hooks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          {connectedHooks.length === 0 && unconnectedSpecs.length === 0 ? (
            <Text text03 secondaryBody>
              {search
                ? "No hooks match your search."
                : "No hook points are available."}
            </Text>
          ) : (
            <>
              {connectedHooks.map((hook) => {
                const spec = specs?.find(
                  (s) => s.hook_point === hook.hook_point
                );
                return (
                  <ConnectedHookCard
                    key={hook.id}
                    hook={hook}
                    spec={spec}
                    onEdit={() => setEditHook(hook)}
                    onDeleted={() => handleHookDeleted(hook.id)}
                    onToggled={handleHookSuccess}
                  />
                );
              })}
              {unconnectedSpecs.map((spec) => {
                const UnconnectedIcon = getHookPointIcon(spec.hook_point);
                return (
                  <Card
                    key={spec.hook_point}
                    variant="secondary"
                    padding={0.5}
                    gap={0}
                    className="hover:border-border-02"
                  >
                    <ContentAction
                      sizePreset="main-ui"
                      variant="section"
                      paddingVariant="sm"
                      icon={UnconnectedIcon}
                      title={spec.display_name}
                      iconClassName="text-text-04"
                      description={spec.description}
                      bottomChildren={
                        spec.docs_url ? (
                          <a
                            href={spec.docs_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 w-fit font-secondary-body text-text-03"
                          >
                            <span className="underline">Documentation</span>
                            <SvgExternalLink size={12} className="shrink-0" />
                          </a>
                        ) : undefined
                      }
                      rightChildren={
                        <Button
                          prominence="tertiary"
                          rightIcon={SvgArrowExchange}
                          onClick={() => setConnectSpec(spec)}
                        >
                          Connect
                        </Button>
                      }
                    />
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Create modal */}
      <HookFormModal
        key={connectSpec?.hook_point ?? "create"}
        open={!!connectSpec}
        onOpenChange={(open) => {
          if (!open) setConnectSpec(null);
        }}
        spec={connectSpec ?? undefined}
        onSuccess={handleHookSuccess}
      />

      {/* Edit modal */}
      <HookFormModal
        key={editHook?.id ?? "edit"}
        open={!!editHook}
        onOpenChange={(open) => {
          if (!open) setEditHook(null);
        }}
        hook={editHook ?? undefined}
        spec={connectSpec_ ?? undefined}
        onSuccess={handleHookSuccess}
      />
    </>
  );
}
