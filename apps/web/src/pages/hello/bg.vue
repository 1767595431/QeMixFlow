<template>
  <div class="bgArt" aria-hidden="true">
    <img v-for="(source, index) in artSources" :key="source" class="artImage" :class="{ active: index === artIndex }" :src="source" alt="" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import helloArt1 from "@/assets/helloArt1.jpg";
import helloArt2 from "@/assets/helloArt2.jpg";
import helloArt3 from "@/assets/helloArt3.jpg";

// ACT: 右侧整图轮播，保留原图画面，不做胶片裁切与调色。
const artSources = [helloArt1, helloArt2, helloArt3];
const artInterval = 8000;
const artIndex = ref(0);
let artTimer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  artTimer = setInterval(() => {
    artIndex.value = (artIndex.value + 1) % artSources.length;
  }, artInterval);
});

onUnmounted(() => clearInterval(artTimer));
</script>

<style lang="scss" scoped>
.bgArt {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #111213;

  .artImage {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.6s ease;

    &.active {
      opacity: 1;
    }
  }
}
</style>
