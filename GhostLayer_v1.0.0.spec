# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_all

# Динамическое определение пути к SpaCy модели
def get_spacy_model_path():
    """Находит путь к установленной модели SpaCy en_core_web_sm"""
    try:
        import en_core_web_sm
        return en_core_web_sm.__path__[0]
    except ImportError:
        # Fallback: попытка найти в site-packages
        if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            # Virtual environment
            site_packages = os.path.join(sys.prefix, 'Lib', 'site-packages')
        else:
            import site
            site_packages = site.getsitepackages()[0]

        model_path = os.path.join(site_packages, 'en_core_web_sm')
        if os.path.exists(model_path):
            return model_path
        raise FileNotFoundError(f"SpaCy model 'en_core_web_sm' not found. Please install it with: python -m spacy download en_core_web_sm")

spacy_model_path = get_spacy_model_path()
print(f"Using SpaCy model from: {spacy_model_path}")

datas = [('src', 'src'), (spacy_model_path, 'en_core_web_sm')]
binaries = []
hiddenimports = ['spacy.lang.en', 'spacy.lang.ru', 'docx']
tmp_ret = collect_all('natasha')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('yargy')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('ipymarkup')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('python-docx')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['src\\main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['torch', 'torchaudio', 'torchvision'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)
splash = Splash(
    'assets/splash.png',
    binaries=a.binaries,
    datas=a.datas,
    text_pos=None,
    text_size=12,
    minify_script=True,
    always_on_top=True,
)

exe = EXE(
    pyz,
    a.scripts,
    splash,
    [],
    exclude_binaries=True,
    name='GhostLayer_v1.0.0',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    splash.binaries,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='GhostLayer_v1.0.0',
)
