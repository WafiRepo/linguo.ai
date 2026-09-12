// Exercise the actual TS stores/helpers with an in-memory native storage adapter.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
// Simulate a release build (Metro replaces __DEV__ with `false` there) so
// this test verifies the actual production-safe state: AI endpoints closed.
global.__DEV__ = false;
const saved = new Map();
let failRead = false;
const nativeStorage = {
  getItem: async (key) => {
    if (failRead) throw new Error('disk unavailable');
    return saved.get(key) ?? null;
  },
  setItem: async (key, value) => { saved.set(key, value); },
  removeItem: async (key) => { saved.delete(key); },
};
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (id) => {
    if (id === '@react-native-async-storage/async-storage') return nativeStorage;
    if (id.startsWith('@/')) return load(path.join(root, id.slice(2) + '.ts'));
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
    return require(id);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

async function main() {
  const { loadLearningAccount, resetCurrentAccountData } = load(path.join(root, 'lib/learningAccount.ts'));
  const { setAccountStorageWritable } = load(path.join(root, 'lib/accountStorage.ts'));
  const { useLearningStore: learning } = load(path.join(root, 'store/learningStore.ts'));
  const { useLanguageStore: language } = load(path.join(root, 'store/languageStore.ts'));
  const { useChildProfileStore: childProfile } = load(path.join(root, 'store/childProfileStore.ts'));
  saved.set('learning-storage', 'legacy-data');

  await loadLearningAccount('A');
  setAccountStorageWritable(true);
  learning.getState().completeLesson('id-lesson-1');
  language.getState().setSelectedLanguage('id');
  childProfile.getState().setChildProfile('小美', '4');
  const xp = learning.getState().xpToday;
  learning.getState().completeLesson('id-lesson-1');
  assert.equal(learning.getState().xpToday, xp, 'repeating completion does not duplicate XP');
  const accountA = saved.get('learning-v2:A');

  await loadLearningAccount('B');
  assert.deepEqual(learning.getState().completedLessonIds, [], 'B cannot see A history');
  assert.equal(language.getState().selectedLanguage, null, 'B has separate preferences');
  assert.equal(childProfile.getState().nickname, null, 'B cannot see A child profile');
  assert.equal(saved.get('learning-v2:A'), accountA, 'switching does not overwrite A');
  setAccountStorageWritable(true);
  learning.getState().completeLesson('id-lesson-2');
  await loadLearningAccount('A');
  assert.deepEqual(learning.getState().completedLessonIds, ['id-lesson-1'], 'A history survives a round trip');
  assert.equal(language.getState().selectedLanguage, 'id');
  assert.equal(childProfile.getState().nickname, '小美', "A's child profile survives a round trip");
  assert.equal(childProfile.getState().classGroup, '4');
  assert.equal(saved.get('learning-storage'), 'legacy-data', 'unowned legacy data stays untouched');
  await loadLearningAccount('signed-out');
  learning.getState().addXP(10);
  assert.equal(saved.has('learning-v2:signed-out'), false, 'signed-out state cannot persist');
  failRead = true;
  await assert.rejects(loadLearningAccount('A'), /Storage hydration failed/, 'failed storage blocks access');
  failRead = false;
  await loadLearningAccount('A');
  assert.deepEqual(learning.getState().completedLessonIds, ['id-lesson-1'], 'retry restores saved data');

  resetCurrentAccountData();
  assert.deepEqual(learning.getState().completedLessonIds, [], 'delete-data clears learning progress in memory');
  assert.equal(childProfile.getState().nickname, null, 'delete-data clears child profile in memory');
  await loadLearningAccount('A');
  assert.deepEqual(learning.getState().completedLessonIds, [], 'delete-data persisted: reload sees no progress');
  assert.equal(childProfile.getState().nickname, null, 'delete-data persisted: reload sees no child profile');
  assert.equal(saved.get('learning-storage'), 'legacy-data', 'delete-data does not touch unowned legacy data');

  const tokens = load(path.join(root, 'app/api/stream-token+api.ts'));
  const sessions = load(path.join(root, 'app/api/agent-session+api.ts'));
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('disabled AI must not contact vendors'); };
  try {
    assert.equal((await tokens.GET(new Request('https://test/api/stream-token'))).status, 503);
    assert.equal((await sessions.POST(new Request('https://test/api/agent-session', { method: 'POST' }))).status, 503);
    assert.equal((await sessions.DELETE(new Request('https://test/api/agent-session', { method: 'DELETE' }))).status, 503);
  } finally { global.fetch = originalFetch; }
  console.log('Child pilot tests passed: account isolation, persistence, duplicate XP, storage failure recovery, and closed AI endpoints.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
