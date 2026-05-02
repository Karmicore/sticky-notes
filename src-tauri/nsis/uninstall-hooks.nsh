!macro NSIS_HOOK_PREUNINSTALL
  SetShellVarContext current
  IfFileExists "$HOME\.stickynotes\*.*" 0 noDataDir
    MessageBox MB_YESNO "是否删除便签数据？$\n$\n数据目录: $HOME\.stickynotes" IDYES deleteData IDNO noDataDir
    deleteData:
      RMDir /r "$HOME\.stickynotes"
    noDataDir:
!macroend
