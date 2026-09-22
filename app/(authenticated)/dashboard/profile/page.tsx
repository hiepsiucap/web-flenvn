import { permanentRedirect } from "next/navigation";

export default function ProfilePage() {
  permanentRedirect("/settings");
}
