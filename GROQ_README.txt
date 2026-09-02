TeachAssist+ — Groq GPT Access Patch

What changed
------------
- Removes Apple Foundation Models from the GPT Access implementation.
- GPT Access is now powered by Groq.
- No Groq SDK package is required; TeachAssist+ uses Groq's documented
  OpenAI-compatible REST endpoint directly with fetch().
- Default model: openai/gpt-oss-20b.
- Groq API key is stored with the existing TeachAssist+ SecureStorage wrapper.
- The key is validated against Groq's /models endpoint before it is saved.
- Clear messages for invalid key, rate limit (429), server errors, and timeouts.
- The GPT Access setup screen now contains step-by-step key instructions and an
  "Open Groq API Keys" button.
- The existing Advanced > Experiments code remains GPT.
- The Misc GPT card still has its Disable control.

If you installed the Apple Foundation Models patch previously
-------------------------------------------------------------
After extracting this patch into the repo, run:
  .\REMOVE_OLD_APPLE_AI.ps1

That deletes modules\apple-foundation-models if it exists.

Install
-------
1. Extract this ZIP over C:\Development\teachassist.
2. If you had installed the Apple patch:
     .\REMOVE_OLD_APPLE_AI.ps1
3. Run:
     npm install
     npx expo-doctor
4. Start Dev:
     $env:APP_VARIANT="development"
     npx expo start --dev-client --lan --clear

Groq setup inside TeachAssist+
------------------------------
1. Settings > Advanced > Enable experiments.
2. Enter GPT.
3. Open Misc > GPT Access.
4. Tap Open Groq API Keys.
5. Sign in/create a Groq account.
6. Create an API key.
7. Copy it, return to TeachAssist+, paste it, and tap Save & Connect.

The Groq Free plan is rate-limited. The app shows a friendly message if you hit
a 429 rate limit.

Native build note
-----------------
Groq itself adds no native dependency, so a current Dev IPA can test the JS
integration immediately. Rebuild the stable IPA later to bake it into the main
TeachAssist+ app.
