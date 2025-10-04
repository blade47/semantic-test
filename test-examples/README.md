# Test Examples

Example test suites demonstrating FlowTest capabilities. These are production-ready examples you can run and learn from.

## Running Examples

All examples work out of the box (except those requiring API keys):

```bash
# Run individual example
node src/suite-runner.js test-examples/simple-api-test.json

# Or use the CLI
npx flowtest test-examples/simple-api-test.json
```

## Available Examples

### ✅ simple-api-test.json
**No setup required** - Tests JSONPlaceholder public API

**Demonstrates:**
- Basic HTTP GET request
- JSON response parsing
- Content validation
- Assertions on status and data fields

**Run:**
```bash
node src/suite-runner.js test-examples/simple-api-test.json
```

**Expected:** ✅ PASS

---

### ✅ simple-env-test.json
**Requires:** Environment variable `API_URL`

**Demonstrates:**
- Environment variable resolution (`${env.VAR}`)
- Context usage
- Variable interpolation in URLs

**Run:**
```bash
export API_URL=https://jsonplaceholder.typicode.com
node src/suite-runner.js test-examples/simple-env-test.json
```

**Expected:** ✅ PASS

---

### ✅ debug-env.json
**Requires:** Environment variables `API_URL` and `USER_ID`

**Demonstrates:**
- Multiple environment variables
- Variable substitution in pipelines
- Debugging environment setup

**Run:**
```bash
export API_URL=https://jsonplaceholder.typicode.com
export USER_ID=1
node src/suite-runner.js test-examples/debug-env.json
```

**Expected:** ✅ PASS

---

### ✅ test-error-reporting.json
**No setup required**

**Demonstrates:**
- Error detection and reporting
- Pipeline failure handling
- Rich error output
- Multiple validation blocks

**Run:**
```bash
node src/suite-runner.js test-examples/test-error-reporting.json
```

**Expected:** ✅ PASS

---

### 🔑 test-llm-judge.json
**Requires:** `OPENAI_API_KEY` environment variable

**Demonstrates:**
- LLM Judge for semantic evaluation
- MockData block for testing
- Tool call validation
- GPT-4 integration

**Run:**
```bash
export OPENAI_API_KEY=sk-your-key
node src/suite-runner.js test-examples/test-llm-judge.json
```

**Expected:** ✅ PASS (uses OpenAI API)

---

### 🔑 test-reporting.json
**Requires:** `OPENAI_API_KEY` environment variable

**Demonstrates:**
- Rich output formatting
- Judge reasoning display
- Tool error reporting
- Assertion details

**Run:**
```bash
export OPENAI_API_KEY=sk-your-key
node src/suite-runner.js test-examples/test-reporting.json
```

**Expected:** ✅ PASS (uses OpenAI API)

---

## Quick Test All

Test all examples that don't require API keys:

```bash
# Works without any setup
node src/suite-runner.js test-examples/simple-api-test.json

# With environment variables
export API_URL=https://jsonplaceholder.typicode.com
export USER_ID=1
node src/suite-runner.js test-examples/simple-env-test.json
node src/suite-runner.js test-examples/debug-env.json
node src/suite-runner.js test-examples/test-error-reporting.json

# With OpenAI API key
export OPENAI_API_KEY=sk-your-key
node src/suite-runner.js test-examples/test-llm-judge.json
node src/suite-runner.js test-examples/test-reporting.json
```

## What Each Example Teaches

### For Beginners
1. Start with **simple-api-test.json** - Basic HTTP, parse, validate
2. Try **simple-env-test.json** - Learn environment variables
3. Run **debug-env.json** - Understand context and variables

### For Intermediate Users
4. Check **test-error-reporting.json** - Error handling patterns
5. Study **test-llm-judge.json** - AI response evaluation
6. Review **test-reporting.json** - Rich output features

## Common Patterns Shown

### Input Formats

**String reference:**
```json
"input": "${response.body}"
```

**From/As mapping:**
```json
"input": {
  "from": "response.body",
  "as": "text"
}
```

**Direct object:**
```json
"input": {
  "url": "https://api.example.com",
  "method": "GET"
}
```

### Output Formats

**Single slot:**
```json
"output": "response"
```

**Multiple slots:**
```json
"output": {
  "parsed": "data",
  "error": "err"
}
```

### Assertions

**Equality:**
```json
"assertions": {
  "response.status": 200
}
```

**Comparisons:**
```json
"assertions": {
  "score": { "gt": 0.7 }
}
```

**String matching:**
```json
"assertions": {
  "text": { "contains": "success" }
}
```

## Troubleshooting

**"Missing required inputs"**
- Check that input format matches block expectations
- Verify slot names match previous block outputs

**"Invalid URL"**
- Ensure environment variables are exported
- Check variable names match context definitions

**"OPENAI_API_KEY environment variable is missing"**
- Set API key: `export OPENAI_API_KEY=sk-your-key`
- Or skip LLM Judge examples

**Network errors**
- Ensure internet connection
- Check API endpoints are accessible

## Creating Your Own Examples

Use these as templates:

1. Copy an example file
2. Modify the pipeline blocks
3. Update assertions
4. Test with: `node src/suite-runner.js your-test.json`

See main [README.md](../README.md) for full documentation.
