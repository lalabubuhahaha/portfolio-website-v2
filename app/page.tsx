import { GravityStory } from "@/components/gravity/gravity-story";
import { SelectedWork } from "@/components/portfolio/selected-work";
import { AboutOverview } from "@/components/portfolio/about-overview";
import { Reveal } from "@/components/gravity/reveal";
export default function HomePage() {
  return (
    <main id="main" tabIndex={-1} className="home-main">
      <GravityStory />
      <div className="foundation-content">
        <SelectedWork />
        <Reveal>
          <AboutOverview />
        </Reveal>
      </div>
    </main>
  );
}
