// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
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
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650;9..144,700&family=Outfit:wght@400;500;600;700&display=swap',
        },
      ],
      meta: [
        { name: 'theme-color', content: '#1f8a70' },
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
