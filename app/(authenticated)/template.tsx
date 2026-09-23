export default function AuthenticatedTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full motion-page-enter motion-reduce-safe">{children}</div>;
}
