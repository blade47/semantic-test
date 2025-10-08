# SemanticTest Documentation

This directory contains the Mintlify documentation for SemanticTest.

**Live Documentation**: [https://docs.semantictest.dev](https://docs.semantictest.dev)

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

## 📝 Documentation Status

### ✅ Completed Sections

#### Examples
- [x] basic-api-test.mdx
- [x] ai-chat-test.mdx
- [x] calendar-agent.mdx
- [x] error-handling.mdx

#### AI Testing
- [x] overview.mdx
- [x] semantic-validation.mdx
- [x] tool-calls.mdx
- [x] streaming-responses.mdx
- [x] multi-turn-conversations.mdx

#### Blocks
- [x] overview.mdx
- [x] llm-judge.mdx
- [x] validate-content.mdx
- [x] validate-tools.mdx
- [x] http-request.mdx
- [x] json-parser.mdx
- [x] stream-parser.mdx
- [x] loop.mdx

#### Concepts
- [x] pipelines.mdx
- [x] data-flow.mdx
- [x] input-formats.mdx
- [x] output-formats.mdx
- [x] assertions.mdx

### 📋 Pages To Create

#### Advanced
- [ ] custom-blocks.mdx
- [ ] test-suites.mdx
- [ ] environment-variables.mdx
- [ ] programmatic-usage.mdx
- [ ] debugging.mdx

#### API Reference
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
