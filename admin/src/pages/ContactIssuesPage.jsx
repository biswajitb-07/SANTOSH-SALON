import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { CheckCircle2, Clock3, Mail, MessageSquare, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "../lib/firebase.js";
import { ButtonSpinner, PaginationControls } from "../components/common.jsx";

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
  open: "bg-[#451011] text-[#ffb4b4]",
  pending: "bg-[#451011] text-[#ffb4b4]",
  in_progress: "bg-[#3a2a16] text-[#ffd279]",
  resolved: "bg-[#10281f] text-[#7de2ae]",
  deleted: "bg-[#241f1f] text-[#aebfba]"
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

  useEffect(() => {
    setPage(1);
  }, [issues.length]);

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
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error.message || "Message could not be deleted.");
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

      <div className="mt-6 overflow-hidden rounded-3xl border border-[#5a2525]/60">
        <div className="grid min-w-[960px] grid-cols-[1.2fr_1fr_2fr_0.8fr_1.3fr] bg-[#13201d] px-5 py-4 text-sm font-black text-[#a9bfba]">
          <span>Customer</span>
          <span>Contact</span>
          <span>Message</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[960px] divide-y divide-[#5a2525]/50">
            {visibleIssues.map((issue) => (
              <div
                className="grid grid-cols-[1.2fr_1fr_2fr_0.8fr_1.3fr] items-center gap-4 px-5 py-4"
                key={issue.id}
              >
                <div>
                  <p className="font-black text-white">{issue.name}</p>
                  <p className="mt-1 text-sm font-bold text-[#a9bfba]">{formatIssueTime(issue.createdAt)}</p>
                </div>
                <div className="space-y-1 text-sm font-bold text-[#d9e5df]">
                  <p className="flex items-center gap-2"><Phone size={15} /> {issue.mobile}</p>
                  <p className="flex items-center gap-2"><Mail size={15} /> {issue.email}</p>
                </div>
                <p className="line-clamp-3 font-bold leading-6 text-[#d9e5df]">{issue.message}</p>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                    statusClass[issue.status] || statusClass.open
                  }`}
                >
                  {statusCopy[issue.status] || "Open"}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="flex min-h-11 items-center gap-2 rounded-2xl bg-[#2b1d10] px-4 font-bold text-[#ffcc70] disabled:opacity-60"
                    disabled={actionLoading === `${issue.id}-in_progress`}
                    onClick={() => updateIssueStatus(issue.id, "in_progress")}
                    type="button"
                  >
                    {actionLoading === `${issue.id}-in_progress` ? <ButtonSpinner /> : <Clock3 size={16} />}
                    Working
                  </button>
                  <button
                    className="flex min-h-11 items-center gap-2 rounded-2xl bg-[#10281f] px-4 font-bold text-[#7de2ae] disabled:opacity-60"
                    disabled={actionLoading === `${issue.id}-resolved`}
                    onClick={() => updateIssueStatus(issue.id, "resolved")}
                    type="button"
                  >
                    {actionLoading === `${issue.id}-resolved` ? <ButtonSpinner /> : <CheckCircle2 size={16} />}
                    Resolve
                  </button>
                  <button
                    className="flex min-h-11 items-center gap-2 rounded-2xl bg-[#451011] px-4 font-bold text-[#ffb4b4] disabled:opacity-60"
                    disabled={actionLoading === `${issue.id}-delete`}
                    onClick={() => deleteIssue(issue.id)}
                    type="button"
                  >
                    {actionLoading === `${issue.id}-delete` ? <ButtonSpinner /> : <Trash2 size={16} />}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
    </section>
  );
}
