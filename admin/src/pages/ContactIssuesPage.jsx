import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { CheckCircle2, Clock3, Mail, MessageSquare, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "../lib/firebase.js";
import {
  ButtonSpinner,
  ConfirmDialog,
  PaginationControls
} from "../components/common.jsx";

const PAGE_SIZE = 8;
const unresolvedStatuses = new Set(["open", "pending", "in_progress"]);

const statusCopy = {
  open: "Open",
  pending: "Pending",
  in_progress: "Working",
  resolved: "Resolved",
  deleted: "Deleted"
};

const statusClass = {
  open: "status-action-chip status-action-open",
  pending: "status-action-chip status-action-pending",
  in_progress: "status-action-chip status-action-in_progress",
  resolved: "status-action-chip status-action-resolved",
  deleted: "status-action-chip status-action-deleted"
};

const getIssueTime = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatIssueTime = (value) => {
  const date = getIssueTime(value);
  if (!date) return "-";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const normalizeIssue = (snapshotDoc) => {
  const data = snapshotDoc.data();
  const status = String(data.status || "open").toLowerCase();
  return {
    id: snapshotDoc.id,
    email: data.email || "-",
    message: data.message || "",
    mobile: data.mobile || "-",
    name: data.name || "Customer",
    source: data.source || "client-contact",
    status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
};

export function ContactIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    setLoading(true);
    const issuesQuery = query(collection(db, "contactIssues"), orderBy("createdAt", "desc"));
    return onSnapshot(
      issuesQuery,
      (snapshot) => {
        setIssues(snapshot.docs.map(normalizeIssue));
        setLoading(false);
      },
      (error) => {
        setIssues([]);
        setLoading(false);
        toast.error(error.message || "Contact messages could not be loaded.");
      }
    );
  }, []);

  const stats = useMemo(() => {
    const unresolved = issues.filter((issue) => unresolvedStatuses.has(issue.status)).length;
    const resolved = issues.filter((issue) => issue.status === "resolved").length;
    return { total: issues.length, unresolved, resolved };
  }, [issues]);

  const totalPages = Math.max(1, Math.ceil(issues.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleIssues = issues.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const visibleIssueIds = visibleIssues.map((issue) => issue.id);
  const visibleAllSelected =
    visibleIssueIds.length > 0 &&
    visibleIssueIds.every((id) => selectedIssueIds.includes(id));
  const selectedIssues = issues.filter((issue) => selectedIssueIds.includes(issue.id));

  useEffect(() => {
    setPage(1);
  }, [issues.length]);

  useEffect(() => {
    setSelectedIssueIds((ids) =>
      ids.filter((id) => issues.some((issue) => issue.id === id))
    );
  }, [issues.length]);

  const toggleIssueSelection = (issueId) => {
    setSelectedIssueIds((ids) =>
      ids.includes(issueId)
        ? ids.filter((id) => id !== issueId)
        : [...ids, issueId]
    );
  };

  const toggleVisibleIssues = (checked) => {
    setSelectedIssueIds((ids) =>
      checked
        ? [...new Set([...ids, ...visibleIssueIds])]
        : ids.filter((id) => !visibleIssueIds.includes(id))
    );
  };

  const updateIssueStatus = async (issueId, status) => {
    const loadingKey = `${issueId}-${status}`;
    setActionLoading(loadingKey);
    try {
      await updateDoc(doc(db, "contactIssues", issueId), {
        status,
        updatedAt: serverTimestamp(),
        resolvedAt: status === "resolved" ? serverTimestamp() : null
      });
      toast.success(
        status === "resolved"
          ? "Message marked resolved. Customer can send a new issue now."
          : "Message status updated."
      );
    } catch (error) {
      toast.error(error.message || "Message status could not be updated.");
    } finally {
      setActionLoading("");
    }
  };

  const deleteIssue = async (issueId) => {
    const loadingKey = `${issueId}-delete`;
    setActionLoading(loadingKey);
    try {
      await deleteDoc(doc(db, "contactIssues", issueId));
      setSelectedIssueIds((ids) => ids.filter((id) => id !== issueId));
      setConfirmDialog(null);
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error.message || "Message could not be deleted.");
    } finally {
      setActionLoading("");
    }
  };

  const deleteSelectedIssues = async () => {
    if (!selectedIssues.length) return;

    setActionLoading("issues-bulk-delete");
    try {
      const batch = writeBatch(db);
      selectedIssues.forEach((issue) => {
        batch.delete(doc(db, "contactIssues", issue.id));
      });
      await batch.commit();
      setSelectedIssueIds([]);
      setConfirmDialog(null);
      toast.success(`${selectedIssues.length} messages deleted.`);
    } catch (error) {
      toast.error(error.message || "Selected messages could not be deleted.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <section className="rounded-[28px] border border-[#5a2525]/60 bg-[#0b1714]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="tracking-[0.35em] text-[#ff9e9e]">MESSAGES</p>
          <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
            Customer contact issues
          </h2>
          <p className="mt-2 max-w-3xl text-[#a9bfba]">
            Open messages block duplicate customer submissions until you resolve or delete them.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
          {[
            ["Total", stats.total],
            ["Open", stats.unresolved],
            ["Resolved", stats.resolved]
          ].map(([label, value]) => (
            <div className="rounded-2xl border border-[#5a2525]/60 bg-[#111f1b] p-3" key={label}>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffcc70]">{label}</p>
              <p className="mt-1 text-2xl font-black text-white">{String(value).padStart(2, "0")}</p>
            </div>
          ))}
        </div>
      </div>

      {issues.length ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#5a2525]/60 bg-[#081311] px-4 py-3">
          <label className="flex items-center gap-3 text-sm font-black text-white">
            <input
              checked={visibleAllSelected}
              className="h-4 w-4 accent-[#991b1b]"
              onChange={(event) => toggleVisibleIssues(event.target.checked)}
              type="checkbox"
            />
            Select page
          </label>
          <button
            className="action-chip action-delete min-h-10 px-4 text-sm disabled:opacity-50"
            disabled={!selectedIssueIds.length}
            onClick={() =>
              setConfirmDialog({
                title: "Delete selected messages?",
                message: `${selectedIssues.length} selected contact messages will be permanently deleted.`,
                confirmLabel: "Delete selected",
                loadingKey: "issues-bulk-delete",
                onConfirm: deleteSelectedIssues
              })
            }
            type="button"
          >
            <Trash2 size={16} />
            Delete selected ({selectedIssueIds.length})
          </button>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-3xl border border-[#5a2525]/60 bg-[#081311]">
        <table className="w-full min-w-[1380px] table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[54px]" />
            <col className="w-[210px]" />
            <col className="w-[150px]" />
            <col className="w-[250px]" />
            <col className="w-[310px]" />
            <col className="w-[130px]" />
            <col className="w-[360px]" />
          </colgroup>
          <thead>
            <tr className="bg-[#13201d] text-sm font-black text-[#a9bfba]">
              <th className="px-5 py-4">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Mobile</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Message</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#5a2525]/50 bg-[#081311]">
            {visibleIssues.map((issue) => (
              <tr key={issue.id}>
                <td className="px-5 py-5 align-middle">
                  <input
                    checked={selectedIssueIds.includes(issue.id)}
                    className="h-4 w-4 accent-[#991b1b]"
                    onChange={() => toggleIssueSelection(issue.id)}
                    type="checkbox"
                  />
                </td>
                <td className="px-5 py-5 align-middle">
                  <p className="font-black text-white">{issue.name}</p>
                  <p className="mt-1 text-sm font-bold text-[#a9bfba]">
                    {formatIssueTime(issue.createdAt)}
                  </p>
                </td>
                <td className="px-5 py-5 align-middle">
                  <p className="flex items-center gap-2 text-sm font-bold text-[#d9e5df]">
                    <Phone size={15} /> {issue.mobile}
                  </p>
                </td>
                <td className="px-5 py-5 align-middle">
                  <p className="flex items-center gap-2 break-words text-sm font-bold leading-6 text-[#d9e5df]">
                    <Mail className="shrink-0" size={15} /> {issue.email}
                  </p>
                </td>
                <td className="px-5 py-5 align-middle">
                  <p className="line-clamp-3 font-bold leading-6 text-[#d9e5df]">
                    {issue.message}
                  </p>
                </td>
                <td className="px-5 py-5 align-middle">
                  <span className={`${statusClass[issue.status] || statusClass.open} text-xs`}>
                    {statusCopy[issue.status] || "Open"}
                  </span>
                </td>
                <td className="bg-[#081311] px-5 py-5 align-middle">
                  <div className="flex min-w-[320px] flex-nowrap items-center gap-2 whitespace-nowrap">
                    <button
                      className="action-chip action-working min-h-10 min-w-[102px] px-3 text-xs disabled:opacity-60"
                      disabled={actionLoading === `${issue.id}-in_progress`}
                      onClick={() => updateIssueStatus(issue.id, "in_progress")}
                      type="button"
                    >
                      {actionLoading === `${issue.id}-in_progress` ? <ButtonSpinner /> : <Clock3 size={16} />}
                      Working
                    </button>
                    <button
                      className="action-chip action-resolve min-h-10 min-w-[102px] px-3 text-xs disabled:opacity-60"
                      disabled={actionLoading === `${issue.id}-resolved`}
                      onClick={() => updateIssueStatus(issue.id, "resolved")}
                      type="button"
                    >
                      {actionLoading === `${issue.id}-resolved` ? <ButtonSpinner /> : <CheckCircle2 size={16} />}
                      Resolve
                    </button>
                    <button
                      className="action-chip action-delete min-h-10 min-w-[94px] px-3 text-xs disabled:opacity-60"
                      disabled={actionLoading === `${issue.id}-delete`}
                      onClick={() =>
                        setConfirmDialog({
                          title: "Delete message?",
                          message: `Message from ${issue.name} will be permanently deleted.`,
                          confirmLabel: "Delete",
                          loadingKey: `${issue.id}-delete`,
                          onConfirm: () => deleteIssue(issue.id)
                        })
                      }
                      type="button"
                    >
                      {actionLoading === `${issue.id}-delete` ? <ButtonSpinner /> : <Trash2 size={16} />}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? (
        <p className="mt-5 rounded-2xl bg-[#111f1b] p-4 text-sm font-bold text-[#a9bfba]">
          Loading contact messages...
        </p>
      ) : null}
      {!loading && !issues.length ? (
        <div className="mt-5 rounded-3xl border border-[#5a2525]/60 bg-[#111f1b] p-8 text-center">
          <MessageSquare className="mx-auto text-[#ffcc70]" size={34} />
          <p className="mt-3 text-lg font-black text-white">No customer messages yet.</p>
          <p className="mt-1 text-[#a9bfba]">Contact form issues will appear here in real time.</p>
        </div>
      ) : null}
      <PaginationControls onPageChange={setPage} page={safePage} totalPages={totalPages} />
      {confirmDialog ? (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          loading={actionLoading === confirmDialog.loadingKey}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          tone="danger"
        />
      ) : null}
    </section>
  );
}
