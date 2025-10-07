# SemanticTest Documentation

This directory contains the Mintlify documentation for SemanticTest.

## 🚀 Quick Start

### Install Mintlify CLI

```bash
npm install -g mintlify
```

### Run Locally

```bash
cd docs
mintlify dev
```

The docs will be available at `http://localhost:3000`.

## 📁 Structure

```
docs/
├── mint.json              # Mintlify configuration
├── introduction.mdx       # Homepage
├── quickstart.mdx         # Getting started guide
├── installation.mdx       # Installation instructions
├── concepts/              # Core concepts
│   ├── pipelines.mdx
│   ├── data-flow.mdx
│   ├── input-formats.mdx
│   ├── output-formats.mdx
│   └── assertions.mdx
├── blocks/                # Block reference
│   ├── overview.mdx
│   ├── http-request.mdx
│   ├── llm-judge.mdx
│   └── ...
├── ai-testing/            # AI testing guides
├── advanced/              # Advanced topics
├── examples/              # Example test cases
└── api-reference/         # API documentation
```

## ✍️ Writing Documentation

### Page Format

Each page is written in MDX (Markdown with JSX):

```mdx
---
title: 'Page Title'
description: 'Page description'
icon: 'icon-name'  # optional
---

## Section Title

Content here...
```

### Common Components

```mdx
# Cards
<Card title="Title" icon="icon-name" href="/path">
  Description
</Card>

# Card Groups
<CardGroup cols={2}>
  <Card>...</Card>
  <Card>...</Card>
</CardGroup>

# Code Blocks
```json
{
  "example": "code"
}
```

# Tabs
<Tabs>
  <Tab title="Tab 1">
    Content
  </Tab>
</Tabs>

# Accordions
<AccordionGroup>
  <Accordion title="Title">
    Content
  </Accordion>
</AccordionGroup>

# Notes and Tips
<Note>Important note</Note>
<Tip>Helpful tip</Tip>
<Warning>Warning message</Warning>

# Steps
<Steps>
  <Step title="Step 1">
    Instructions
  </Step>
</Steps>
```

## 🚢 Deployment

### Option 1: Mintlify Hosting (Recommended)

1. Push your docs to GitHub
2. Sign up at [mintlify.com](https://mintlify.com)
3. Connect your repository
4. Select the `docs` folder
5. Deploy!

Your docs will be live at: `https://your-project.mintlify.app`

### Option 2: Custom Domain

In Mintlify dashboard:
1. Go to Settings → Custom Domain
2. Add your domain (e.g., `docs.semantic-test.com`)
3. Update DNS records as instructed
4. Wait for SSL certificate

### Option 3: Self-Host

Build static files:

```bash
mintlify build
```

This generates static HTML/JS/CSS that you can host anywhere.

## 🎨 Customization

### Update Colors

Edit `mint.json`:

```json
{
  "colors": {
    "primary": "#2563eb",
    "light": "#60a5fa",
    "dark": "#1e40af"
  }
}
```

### Update Logo

Replace logo files in `/docs/logo-dark.svg` and `/docs/logo-light.svg`

### Update Navigation

Edit the `navigation` array in `mint.json`:

```json
{
  "navigation": [
    {
      "group": "Group Name",
      "pages": [
        "page1",
        "page2"
      ]
    }
  ]
}
```

## 📝 TODO

Pages that still need to be created:

### Concepts
- [ ] input-formats.mdx
- [ ] output-formats.mdx
- [ ] assertions.mdx

### Blocks
- [ ] http-request.mdx
- [ ] json-parser.mdx
- [ ] stream-parser.mdx
- [ ] validate-content.mdx
- [ ] validate-tools.mdx
- [ ] loop.mdx
- [ ] mock-data.mdx

### AI Testing
- [ ] overview.mdx
- [ ] semantic-validation.mdx
- [ ] tool-calls.mdx
- [ ] streaming-responses.mdx
- [ ] multi-turn-conversations.mdx

### Advanced
- [ ] custom-blocks.mdx
- [ ] test-suites.mdx
- [ ] environment-variables.mdx
- [ ] programmatic-usage.mdx
- [ ] debugging.mdx

### Examples
- [ ] basic-api-test.mdx
- [ ] ai-chat-test.mdx
- [ ] calendar-agent.mdx
- [ ] error-handling.mdx

### API Reference
- [ ] cli.mdx
- [ ] pipeline-builder.mdx
- [ ] block-registry.mdx
- [ ] data-bus.mdx

## 🔗 Useful Links

- [Mintlify Documentation](https://mintlify.com/docs)
- [MDX Documentation](https://mdxjs.com/)
- [Mintlify Components](https://mintlify.com/docs/content/components)

## 🤝 Contributing

To contribute to the documentation:

1. Create a new `.mdx` file in the appropriate directory
2. Add it to `mint.json` navigation
3. Write content using MDX
4. Test locally with `mintlify dev`
5. Submit a pull request

## 📧 Questions?

- GitHub Issues: https://github.com/blade47/semantic-test/issues
- GitHub Discussions: https://github.com/blade47/semantic-test/discussions
