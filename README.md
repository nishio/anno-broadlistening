# Talk to the City

Talk to the City（[TTTC](https://github.com/AIObjectives/talk-to-the-city-reports)）のscatterについて、幾つかの改良を行ったレポジトリです。

## セットアップ

### Python環境のセットアップ

本プロジェクトはPython 3.10での動作を推奨しています。Python 3.12を使用すると、以下のようなエラーが発生する場合があります：

```
ModuleNotFoundError: No module named 'distutils'
```

このエラーを回避し、安定した環境でプロジェクトを実行するために、pyenvを使用してPython 3.10をインストールすることを推奨します。以下の手順で環境をセットアップしてください：

1. pyenvのインストール（まだインストールしていない場合）:
```bash
curl https://pyenv.run | bash
```

2. pyenvの設定をシェルに追加（.bashrcや.zshrcに以下を追加）:
```bash
export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"
```

3. Python 3.10のインストールと設定:
```bash
pyenv install 3.10
pyenv local 3.10
```

4. 依存パッケージのインストール:
```bash
pip install -r scatter/requirements.txt
```

## Talk to the City Reports

CLIでレポートを出力するアプリケーションです。Pythonとnextをベースにしており、静的でインタラクティブな散布図レポートとサマリーを生成します。
