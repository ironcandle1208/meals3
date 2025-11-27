import { device, element, by, expect as detoxExpect } from 'detox';

describe('認証フロー E2Eテスト', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('ログイン画面', () => {
    it('起動時にログインボタンが表示される', async () => {
      // Buttonコンポーネントはtest IDをサポートしているはず
      await detoxExpect(element(by.id('login-button'))).toBeVisible();
    });

    it('サインアップリンクをタップするとサインアップ画面に遷移する', async () => {
      await element(by.id('login-signup-link')).tap();
      await detoxExpect(element(by.id('signup-button'))).toBeVisible();
    });
  });
});
