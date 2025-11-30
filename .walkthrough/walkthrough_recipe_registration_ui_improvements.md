# レシピ登録UI改善 Walkthrough

## 概要

ユーザーの要望に基づき、以下の3つの改善を実装しました：

1. **メニューにレシピ登録ボタンを追加** - ホーム画面のヘッダーから直接レシピ登録画面にアクセス可能に
2. **画像アップロード機能** - URL入力からデバイス内の画像選択に変更
3. **作り方入力欄の拡大** - 入力欄を3倍に拡大し、フォームの最下部に配置

## 実装内容

### 1. ホーム画面へのレシピ登録ボタン追加

#### [index.tsx](file:///Users/ironcandle1208/Documents/project/meals3/app/(app)/index.tsx)

- ヘッダーに「レシピ登録」ボタンを追加
- グループが存在しない場合はボタンを無効化
- ボタン押下時に最初のグループを自動選択してレシピ登録画面に遷移

```tsx
// レシピ登録ボタン押下時の処理：最初のグループを選択してレシピ登録画面へ遷移
const handleCreateRecipe = () => {
  if (groups.length > 0) {
    setGroup(groups[0]);
    router.push('/recipes/create');
  }
};
```

---

### 2. 画像アップロード機能の実装

#### [create.tsx](file:///Users/ironcandle1208/Documents/project/meals3/app/(app)/recipes/create.tsx)

- `expo-image-picker`をインストール（`--legacy-peer-deps`フラグを使用）
- 画像URLテキスト入力フィールドを画像選択ボタンに変更
- 選択した画像のプレビュー表示を追加
- 画像削除ボタンを追加

```tsx
// 画像選択ハンドラ
const handlePickImage = async () => {
  // 画像ライブラリへのアクセス権限をリクエスト
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (permissionResult.granted === false) {
    setError('画像ライブラリへのアクセス権限が必要です');
    return;
  }

  // 画像を選択
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    setImageUrl(result.assets[0].uri);
  }
};
```

**UIの変更点:**
- 画像選択ボタンを追加
- 選択した画像のプレビュー表示（200pxの高さ）
- プレビュー画像の右上に削除ボタンを配置

---

### 3. 作り方入力欄の拡大と配置変更

#### [create.tsx](file:///Users/ironcandle1208/Documents/project/meals3/app/(app)/recipes/create.tsx)

- `numberOfLines`を4から12に変更（3倍に拡大）
- 作り方入力欄をタグセクションの後に移動（フォームの最下部）
- `minHeight: 150`のスタイルを追加して十分な入力スペースを確保

**フォームの新しい順序:**
1. レシピ名
2. 画像選択
3. 材料
4. タグ
5. **作り方**（最下部に移動）

## 変更されたファイル

- [index.tsx](file:///Users/ironcandle1208/Documents/project/meals3/app/(app)/index.tsx) - レシピ登録ボタンを追加
- [create.tsx](file:///Users/ironcandle1208/Documents/project/meals3/app/(app)/recipes/create.tsx) - 画像アップロード機能と作り方入力欄の改善
- [package.json](file:///Users/ironcandle1208/Documents/project/meals3/package.json) - `expo-image-picker`を追加

## テスト項目

### 手動テスト

以下の項目を確認してください：

1. **ホーム画面のレシピ登録ボタン**
   - [ ] ヘッダーに「レシピ登録」ボタンが表示されている
   - [ ] グループが存在する場合、ボタンが有効になっている
   - [ ] グループが存在しない場合、ボタンが無効になっている
   - [ ] ボタンを押下するとレシピ登録画面に遷移する

2. **画像選択機能**
   - [ ] 「画像を選択」ボタンが表示されている
   - [ ] ボタンを押下すると画像ライブラリが開く
   - [ ] 画像を選択するとプレビューが表示される
   - [ ] プレビュー画像の右上に削除ボタンが表示される
   - [ ] 削除ボタンを押下すると画像が削除される

3. **作り方入力欄**
   - [ ] 作り方入力欄がタグの後に配置されている
   - [ ] 入力欄が十分な高さ（約150px）で表示されている
   - [ ] 複数行のテキストを入力できる

4. **レシピ作成**
   - [ ] 画像を選択してレシピを作成できる
   - [ ] レシピが正常に保存される

## 注意事項

- `expo-image-picker`のインストール時に`@config-plugins/detox`との依存関係の競合が発生したため、`--legacy-peer-deps`フラグを使用してインストールしました
- 画像はデバイスのローカルストレージから選択されるため、`uri`形式で保存されます
- 画像のアップロードやストレージへの保存は実装されていません（現在は`image_url`フィールドにローカルURIを保存）

## 今後の改善案

1. **画像のアップロード機能** - Supabase Storageに画像をアップロードして永続化
2. **カメラ機能** - デバイスのカメラで直接撮影した画像を使用
3. **複数画像のサポート** - レシピに複数の画像を追加できるように
