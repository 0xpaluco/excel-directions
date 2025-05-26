// _config.ts
import lume from "lume/mod.ts";
import nunjucks from "lume/plugins/nunjucks.ts";
import icons from "lume/plugins/icons.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import postcss from "lume/plugins/postcss.ts";
import terser from "lume/plugins/terser.ts";
import minifyHTML from "lume/plugins/minify_html.ts";
// import cms from "lume/plugins/cms.ts";
import sitemap from "lume/plugins/sitemap.ts";
import robots from "lume/plugins/robots.ts";


const site = lume({
  src: "./src",
  dest: "./dist",
  location: new URL("https://directions.yourdojo.com"),
  cssFile: "/styles.css",
});

site.use(nunjucks(/* Options */));
site.use(icons());

// Tailwind CSS 4 configuration
site.use(tailwindcss({
  options: {
    theme: {
      extend: {
        colors: {
          'dojo-primary': '#1a4a5c',
          'dojo-secondary': '#d2691e',
          'dojo-accent': '#2c7a8c',
        },
        animation: {
          'float': 'float 3s ease-in-out infinite',
          'shimmer': 'shimmer 2s linear infinite',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-10px)' },
          },
          shimmer: {
            '0%': { transform: 'translateX(-100%)' },
            '100%': { transform: 'translateX(100%)' },
          },
        },
        fontFamily: {
          'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        },
      },
    },
  },
}));


site.use(postcss());
site.use(terser());
site.use(minifyHTML());
site.use(sitemap());
site.use(robots());

site.add("styles.css"); //Add the entry point

// Optional: CMS plugin for easy content management
// Uncomment if you want a web-based admin interface
/*
site.use(cms({
  auth: {
    method: "basic",
    users: {
      admin: "your-secure-password-here"
    }
  }
}));
*/

// Copy static assets
site.copy("static");
site.copy("favicon.ico");
site.copy("robots.txt");

export default site;