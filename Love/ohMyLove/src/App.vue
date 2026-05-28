<template>
  <!--
    App 只作为路由出口。

    配置页和动画页的 DOM、样式、生命周期逻辑都放在各自的 View 中，
    这样可以尽量贴近 Config.html / index.html 两个独立页面的结构。
  -->
  <RouterView />
</template>
