import { Search } from "lucide-react";
import { PaginationControls } from "../components/common.jsx";

export function UsersPage({
  filteredUsers,
  googleUsers,
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
    <section className="soft-shadow rounded-3xl bg-white p-5 sm:p-6">
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
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#35201f] bg-white px-4 py-3 text-[#9db2ad] sm:hidden">
        <Search size={18} />
        <input
          className="w-full border-0 bg-transparent outline-none"
          onChange={(event) => setUserSearchTerm(event.target.value)}
          placeholder="Search users, email, phone"
          value={userSearchTerm}
        />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="bg-[#101a18] text-sm text-[#9db2ad]">
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Provider</th>
              <th className="px-5 py-4">Updated</th>
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
