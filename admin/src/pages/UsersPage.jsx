import { Ban, Search, Trash2, Unlock } from "lucide-react";
import { ButtonSpinner, PaginationControls } from "../components/common.jsx";

export function UsersPage({
  actionLoading,
  filteredUsers,
  googleUsers,
  onDeleteUser,
  onToggleUserBlock,
  paginatedUsers,
  registeredUsers,
  safeUsersPage,
  setUserSearchTerm,
  setUsersPage,
  userSearchTerm,
  usersLoading,
  usersTotalPages,
  usersWithPhone
}) {
  return (
    <section className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
            Users
          </p>
          <h2 className="mt-1 text-3xl font-black">
            Website login customers
          </h2>
        </div>
        <span className="rounded-full bg-[#24170d] px-4 py-2 text-sm font-black text-[#991b1b]">
          {registeredUsers.length} users
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Total Users", registeredUsers.length],
          ["Google Login", googleUsers],
          ["Phone Added", usersWithPhone]
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-[#101a18] p-4" key={label}>
            <p className="text-sm font-bold text-[#9db2ad]">
              {label}
            </p>
            <p className="mt-1 text-3xl font-black text-[#f4fbf8]">
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#35201f] bg-[var(--color-surface)] px-4 py-3 text-[#9db2ad] sm:hidden">
        <Search size={18} />
        <input
          className="w-full border-0 bg-transparent outline-none"
          onChange={(event) => setUserSearchTerm(event.target.value)}
          placeholder="Search users, email, phone"
          value={userSearchTerm}
        />
      </div>
      <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-[#5a2525]/60">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="bg-[#101a18] text-sm text-[#9db2ad]">
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Provider</th>
              <th className="px-5 py-4">Updated</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((customer) => (
              <tr className="border-t border-[#35201f]" key={customer.id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {customer.photoURL ? (
                      <img
                        alt={customer.name}
                        className="h-10 w-10 rounded-full object-cover"
                        decoding="async"
                        loading="lazy"
                        src={customer.photoURL}
                      />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#991b1b] font-black uppercase text-white">
                        {customer.name.charAt(0)}
                      </span>
                    )}
                    <span className="font-black">{customer.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-[#9db2ad]">{customer.email}</td>
                <td className="px-5 py-4 text-[#9db2ad]">{customer.phone}</td>
                <td className="px-5 py-4 text-[#9db2ad]">{customer.provider}</td>
                <td className="px-5 py-4 text-[#9db2ad]">
                  {customer.updatedAt?.toDate
                    ? customer.updatedAt.toDate().toLocaleString("en-IN")
                    : "-"}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={
                      customer.blocked
                        ? "status-action-chip status-action-failed"
                        : "status-action-chip status-action-refunded"
                    }
                  >
                    {customer.blocked ? "Blocked" : "Active"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex min-w-[230px] items-center gap-2">
                    <button
                      className={`action-chip min-h-10 min-w-[104px] px-3 text-sm ${
                        customer.blocked ? "action-done" : "action-skip"
                      }`}
                      disabled={actionLoading === `user-${customer.id}-block`}
                      onClick={() => onToggleUserBlock(customer)}
                      type="button"
                    >
                      {actionLoading === `user-${customer.id}-block` ? (
                        <ButtonSpinner />
                      ) : customer.blocked ? (
                        <Unlock size={16} />
                      ) : (
                        <Ban size={16} />
                      )}
                      {customer.blocked ? "Unblock" : "Block"}
                    </button>
                    <button
                      className="action-chip action-delete min-h-10 min-w-[104px] px-3 text-sm"
                      disabled={actionLoading === `user-${customer.id}-delete`}
                      onClick={() => onDeleteUser(customer)}
                      type="button"
                    >
                      {actionLoading === `user-${customer.id}-delete` ? (
                        <ButtonSpinner />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usersLoading ? (
          <p className="p-5 text-sm font-bold text-[#9db2ad]">Loading users...</p>
        ) : null}
        {!usersLoading && !filteredUsers.length ? (
          <p className="p-5 text-sm font-bold text-[#9db2ad]">
            {registeredUsers.length
              ? "No users matched your search."
              : "No website users have logged in yet."}
          </p>
        ) : null}
        <PaginationControls
          onPageChange={setUsersPage}
          page={safeUsersPage}
          totalPages={usersTotalPages}
        />
      </div>
    </section>
  );
}
