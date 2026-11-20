import { GravityStory } from "@/components/gravity/gravity-story";
import { SelectedWork } from "@/components/portfolio/selected-work";
export default function HomePage() {
  return (
    <main id="main" tabIndex={-1} className="home-main">
      <GravityStory featuredWork={<SelectedWork />} />
    </main>
  );
}
