import { lazy, PropsWithChildren, Suspense, useEffect, useState } from "react";
import About from "./About";
import Career from "./Career";
import Contact from "./Contact";
import Cursor from "./Cursor";
import Landing from "./Landing";
import Navbar from "./Navbar";
import SocialIcons from "./SocialIcons";
import WhatIDo from "./WhatIDo";
import Work from "./Work";
import setSplitText from "./utils/splitText";
import { useLoading } from "../context/LoadingProvider";

const TechStack = lazy(() => import("./TechStack"));
// Loaded after the intro finishes so it never competes with the 3D scene.
const Assistant = lazy(() => import("./Assistant"));
// Dev-only FPS readout; the whole branch is dropped from production builds.
const DevFps = import.meta.env.DEV ? lazy(() => import("./DevFps")) : null;

const MainContainer = ({ children }: PropsWithChildren) => {
  const { isLoading } = useLoading();
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );

  useEffect(() => {
    const resizeHandler = () => {
      setSplitText();
      setIsDesktopView(window.innerWidth > 1024);
    };
    resizeHandler();
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [isDesktopView]);

  return (
    <div className="container-main">
      <Cursor />
      <Navbar />
      <SocialIcons />
      {!isLoading && (
        <Suspense fallback={null}>
          <Assistant />
        </Suspense>
      )}
      {DevFps && (
        <Suspense fallback={null}>
          <DevFps />
        </Suspense>
      )}
      {isDesktopView && children}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="container-main">
            <Landing>{!isDesktopView && children}</Landing>
            <About />
            <WhatIDo />
            <Career />
            <Work />
            {isDesktopView && (
              <Suspense fallback={<div>Loading....</div>}>
                <TechStack />
              </Suspense>
            )}
            <Contact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainContainer;
