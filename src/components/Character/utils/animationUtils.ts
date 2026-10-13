import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { eyebrowBoneNames, typingBoneNames } from "../../../data/boneData";

const setAnimations = (gltf: GLTF) => {
  let character = gltf.scene;
  let mixer = new THREE.AnimationMixer(character);
  let typingAction: THREE.AnimationAction | null = null;
  if (gltf.animations) {
    const introClip = gltf.animations.find(
      (clip) => clip.name === "introAnimation"
    );
    const introAction = mixer.clipAction(introClip!);
    introAction.setLoop(THREE.LoopOnce, 1);
    introAction.clampWhenFinished = true;
    introAction.play();
    const clipNames = ["key1", "key2", "key5", "key6"];
    clipNames.forEach((name) => {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (clip) {
        const action = mixer?.clipAction(clip);
        action!.play();
        action!.timeScale = 1.2;
      } else {
        console.error(`Animation "${name}" not found`);
      }
    });
    typingAction = createBoneAction(gltf, mixer, "typing", typingBoneNames);
    if (typingAction) {
      typingAction.enabled = true;
      typingAction.play();
      typingAction.timeScale = 1.2;
    }
  }
  function startIntro() {
    const introClip = gltf.animations.find(
      (clip) => clip.name === "introAnimation"
    );
    const introAction = mixer.clipAction(introClip!);
    introAction.clampWhenFinished = true;
    introAction.reset().play();
    setTimeout(() => {
      const blink = gltf.animations.find((clip) => clip.name === "Blink");
      mixer.clipAction(blink!).play().fadeIn(0.5);
    }, 2500);
  }
  // Shared by face hover and the assistant's "thinking" reaction.
  const eyeBrowUpAction = createBoneAction(gltf, mixer, "browup", eyebrowBoneNames);
  if (eyeBrowUpAction) {
    eyeBrowUpAction.setLoop(THREE.LoopOnce, 1);
    eyeBrowUpAction.clampWhenFinished = true;
    eyeBrowUpAction.enabled = true;
  }
  let browsUp = false;
  const raiseBrows = () => {
    if (eyeBrowUpAction && !browsUp) {
      browsUp = true;
      eyeBrowUpAction.reset();
      eyeBrowUpAction.enabled = true;
      eyeBrowUpAction.setEffectiveWeight(4);
      eyeBrowUpAction.fadeIn(0.5).play();
    }
  };
  const lowerBrows = () => {
    if (eyeBrowUpAction && browsUp) {
      browsUp = false;
      eyeBrowUpAction.fadeOut(0.6);
    }
  };

  // The assistant's activity drives the character: brows up while it
  // searches, a burst of faster typing while it answers.
  let typingReset: ReturnType<typeof setTimeout> | undefined;
  function react(state: "idle" | "thinking" | "answering") {
    if (state === "thinking") {
      raiseBrows();
      return;
    }
    lowerBrows();
    if (state !== "answering" || !typingAction) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    typingAction.timeScale = 2.6;
    clearTimeout(typingReset);
    typingReset = setTimeout(() => {
      if (typingAction) typingAction.timeScale = 1.2;
    }, 1600);
  }

  function hover(_gltf: GLTF, hoverDiv: HTMLDivElement) {
    const onHoverFace = raiseBrows;
    const onLeaveFace = lowerBrows;
    if (!hoverDiv) return;
    hoverDiv.addEventListener("mouseenter", onHoverFace);
    hoverDiv.addEventListener("mouseleave", onLeaveFace);
    return () => {
      hoverDiv.removeEventListener("mouseenter", onHoverFace);
      hoverDiv.removeEventListener("mouseleave", onLeaveFace);
    };
  }
  return { mixer, startIntro, hover, react };
};

const createBoneAction = (
  gltf: GLTF,
  mixer: THREE.AnimationMixer,
  clip: string,
  boneNames: string[]
): THREE.AnimationAction | null => {
  const AnimationClip = THREE.AnimationClip.findByName(gltf.animations, clip);
  if (!AnimationClip) {
    console.error(`Animation "${clip}" not found in GLTF file.`);
    return null;
  }

  const filteredClip = filterAnimationTracks(AnimationClip, boneNames);

  return mixer.clipAction(filteredClip);
};

const filterAnimationTracks = (
  clip: THREE.AnimationClip,
  boneNames: string[]
): THREE.AnimationClip => {
  const filteredTracks = clip.tracks.filter((track) =>
    boneNames.some((boneName) => track.name.includes(boneName))
  );

  return new THREE.AnimationClip(
    clip.name + "_filtered",
    clip.duration,
    filteredTracks
  );
};

export default setAnimations;
