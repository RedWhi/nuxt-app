// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,

  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt'],

  css: ['~/assets/styles/main.scss'],

  app: {
    head: {
      htmlAttrs: {
        lang: 'ru',
      },
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Commissioner:wght@400;500;600;700;800&display=swap',
        },
      ],
      meta: [
        { name: 'theme-color', content: '#019ddc' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: (content: string, filename: string): string => {
            // Не инжектим в сами partials — иначе циклический @use
            if (filename.replace(/\\/g, '/').includes('/assets/styles/')) {
              return content
            }

            return `
              @use "~/assets/styles/_variables.scss" as *;
              @use "~/assets/styles/_mixins.scss" as *;
              ${content}
            `
          },
        },
      },
    },
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  // Обход бага Vite: Failed to resolve import "#app-manifest"
  experimental: {
    appManifest: false,
  },
})
