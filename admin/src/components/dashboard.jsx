export function StatCard({ icon: Icon, label, value, trend, tone }) {
  return (
    <article className="soft-shadow rounded-3xl bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>
          <Icon size={22} />
        </span>
        <span className="rounded-full bg-[#24170d] px-3 py-1 text-xs font-black text-[#991b1b]">
          {trend}
        </span>
      </div>
      <p className="mt-5 text-sm font-bold text-[#9db2ad]">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
    </article>
  );
}
