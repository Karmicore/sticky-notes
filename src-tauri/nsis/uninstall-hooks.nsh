!macro NSIS_HOOK_PREUNINSTALL
  MessageBox MB_YESNO "是否删除便签数据？$\n$\n数据目录: $HOME\.stickynotes" IDYES deleteData IDNO skipDelete
  deleteData:
    RMDir /r "$HOME\.stickynotes"
  skipDelete:
!macroend
