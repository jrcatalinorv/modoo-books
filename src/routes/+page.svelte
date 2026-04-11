<script>
  const { data } = $props();
</script>

<svelte:head>
  <title>Midoo Books — Biblioteca</title>
</svelte:head>

<div class="home">
  <header class="home-header">
    <div class="home-brand">MIDOO BOOKS</div>
    <p class="home-tagline">Herramienta de maquetación Web-to-Print</p>
  </header>

  <main class="home-main">
    {#if data.books.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <h2>Sin libros todavía</h2>
        <p>Crea un archivo <code>.md</code> en la carpeta <code>/content</code> para empezar.</p>
        <div class="empty-example">
          <pre>---
title: "Mi Primer Libro"
layout: Standard
variant: light
---

# Capítulo 1

Contenido aquí...</pre>
        </div>
      </div>
    {:else}
      <h2 class="section-title">Biblioteca</h2>
      <div class="book-grid">
        {#each data.books as book (book.slug)}
          <a href="/book/{book.slug}" class="book-card" data-variant={book.variant}>
            <div class="book-cover" style={book.coverImage ? `background-image: url('${book.coverImage}')` : ''}>
              <span class="book-layout-badge">{book.layout}</span>
            </div>
            <div class="book-info">
              <h3 class="book-title">{book.title}</h3>
              {#if book.subtitle}<p class="book-subtitle">{book.subtitle}</p>{/if}
              {#if book.author}<p class="book-author">{book.author}</p>{/if}
              {#if book.description}<p class="book-desc">{book.description}</p>{/if}
            </div>
            <div class="book-action">Abrir maqueta →</div>
          </a>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .home {
    min-height: 100vh;
    background: #1a1a2e;
    color: #f0f0f0;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }

  .home-header {
    padding: 48px 40px 32px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .home-brand {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #7ab8e8;
    margin-bottom: 6px;
  }

  .home-tagline {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    margin: 0;
  }

  .home-main {
    padding: 40px;
    max-width: 1100px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin: 0 0 24px;
  }

  .book-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 24px;
  }

  .book-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .book-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    border-color: rgba(122,184,232,0.4);
  }

  .book-cover {
    height: 160px;
    background: linear-gradient(135deg, #1d4e89 0%, #0d0d0d 100%);
    background-size: cover;
    background-position: center;
    position: relative;
    display: flex;
    align-items: flex-start;
    padding: 10px;
  }

  .book-layout-badge {
    font-size: 10px;
    background: rgba(0,0,0,0.5);
    color: rgba(255,255,255,0.8);
    padding: 2px 8px;
    border-radius: 10px;
    font-family: monospace;
    letter-spacing: 0.05em;
  }

  .book-info {
    padding: 16px;
    flex: 1;
  }

  .book-title {
    font-size: 15px;
    font-weight: 700;
    margin: 0 0 4px;
    color: #fff;
    line-height: 1.3;
  }

  .book-subtitle {
    font-size: 12px;
    font-style: italic;
    color: rgba(255,255,255,0.55);
    margin: 0 0 6px;
  }

  .book-author {
    font-size: 11px;
    color: #7ab8e8;
    margin: 0 0 6px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .book-desc {
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .book-action {
    padding: 12px 16px;
    font-size: 12px;
    color: #7ab8e8;
    border-top: 1px solid rgba(255,255,255,0.08);
    font-weight: 600;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 64px 20px;
    color: rgba(255,255,255,0.5);
  }

  .empty-icon { font-size: 48px; margin-bottom: 16px; }

  .empty-state h2 {
    font-size: 20px;
    color: rgba(255,255,255,0.8);
    margin: 0 0 8px;
  }

  .empty-state p { margin: 0 0 24px; }

  .empty-state code {
    background: rgba(255,255,255,0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
    color: #7ab8e8;
  }

  .empty-example pre {
    display: inline-block;
    text-align: left;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 20px 28px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255,255,255,0.7);
  }
</style>
