# terax-shell-integration (bashrc)
#
# Differences vs zsh integration:
# - We emulate login-shell init manually (/etc/profile, profile files) because
#   bash ignores --rcfile when started with -l.
# - Pre-exec marker uses PS0 (bash 4.4+). On older bash (macOS default 3.2) we
#   skip it — a fragile DEBUG-trap alternative would clobber the user's own
#   traps and interact badly with debuggers.

if [ -z "$__TERAX_HOOKS_LOADED" ]; then
  __TERAX_HOOKS_LOADED=1

  [ -f /etc/profile ] && source /etc/profile
  [ -f /etc/bashrc ] && source /etc/bashrc
  if [ -f "$HOME/.bash_profile" ]; then
    source "$HOME/.bash_profile"
  elif [ -f "$HOME/.bash_login" ]; then
    source "$HOME/.bash_login"
  elif [ -f "$HOME/.profile" ]; then
    source "$HOME/.profile"
  fi
  # .bashrc may have been sourced already by .bash_profile; sourcing again is
  # safe for idempotent rc files (the common case). If yours has side effects
  # on reload, guard with a flag.
  [ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc"

  _terax_prompt_end='\[\e]133;B\e\\\]'
  if [ "${BASH_VERSINFO[0]:-0}" -lt 4 ] \
     || { [ "${BASH_VERSINFO[0]:-0}" -eq 4 ] && [ "${BASH_VERSINFO[1]:-0}" -lt 4 ]; }; then
    unset TERAX_BLOCKS
    _terax_prompt_end='\[\e]133;B;terax_blocks=0\e\\\]'
  fi

  if [ -n "$TERAX_CLI" ] && [ -x "$TERAX_CLI" ]; then
    terax() {
      command "$TERAX_CLI" "$@"
    }
  fi

  _terax_urlencode() {
    local LC_ALL=C s="$1" i c
    for (( i=0; i<${#s}; i++ )); do
      c="${s:i:1}"
      case "$c" in
        [a-zA-Z0-9/._~-]) printf '%s' "$c" ;;
        *) printf '%%%02X' "'$c" ;;
      esac
    done
  }

  _terax_history_sync() {
    local entry
    entry="$(HISTTIMEFORMAT= builtin history 1)"
    entry="${entry#"${entry%%[![:space:]]*}"}"
    _terax_history_id="${entry%%[[:space:]]*}"
    _terax_history_id="${_terax_history_id%\*}"
    case "$_terax_history_id" in
      ''|*[!0-9]*) _terax_history_id=0 ;;
    esac
  }

  _terax_preexec() {
    local entry number cmd
    entry="$(HISTTIMEFORMAT= builtin history 1)"
    entry="${entry#"${entry%%[![:space:]]*}"}"
    number="${entry%%[[:space:]]*}"
    number="${number%\*}"
    case "$number" in
      ''|*[!0-9]*) return 0 ;;
    esac
    # Only a new entry can belong to the accepted input. Without cmdhist,
    # history 1 may contain just the last line of a multiline command.
    if shopt -q cmdhist && (( number == _terax_history_id + 1 )); then
      cmd="${entry#*[[:space:]]}"
      cmd="${cmd#"${cmd%%[![:space:]]*}"}"
      cmd="${cmd//[[:cntrl:]]/ }"
      printf '%s' "${cmd:0:256}"
    fi
  }

  _terax_precmd() {
    local _terax_ret=$?
    printf '\e]133;D;%s\e\\' "$_terax_ret"
    printf '\e]7;file://%s%s\e\\' "${HOSTNAME:-$(uname -n 2>/dev/null)}" "$(_terax_urlencode "$PWD")"
    printf '\e]133;A\e\\'
    # Block mode reserves blank rows above the prompt for the host-drawn block
    # header, mirroring the zsh integration. The shell prompt itself stays
    # visible so the terminal keeps its native direct input flow.
    if [ -n "$TERAX_BLOCKS" ]; then
      if [ -n "$_terax_block_seen" ]; then
        printf '\n\n'
      else
        printf '\n'
      fi
    fi
    case "$PS1" in
      *'133;B'*) ;;
      # Re-inject prompt-end marker in case the prompt was rebuilt (starship).
      *) PS1="${_terax_prompt_end}${PS1}" ;;
    esac
  }

  case ":${PROMPT_COMMAND:-}:" in
    *":_terax_precmd:"*) ;;
    *) PROMPT_COMMAND="_terax_precmd${PROMPT_COMMAND:+;$PROMPT_COMMAND}" ;;
  esac
  case ":${PROMPT_COMMAND:-}:" in
    *":_terax_history_sync:"*) ;;
    *) PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND;}_terax_history_sync" ;;
  esac

  # Pre-exec marker via PS0 (bash 4.4+). PS0 is expanded just before a command
  # runs — cleaner than a DEBUG trap, which would clobber user traps and fire
  # on every command including inside PROMPT_COMMAND.
  if [ "${BASH_VERSINFO[0]:-0}" -gt 4 ] \
     || { [ "${BASH_VERSINFO[0]:-0}" -eq 4 ] && [ "${BASH_VERSINFO[1]:-0}" -ge 4 ]; }; then
    if [ -n "$TERAX_BLOCKS" ]; then
      # The arithmetic inside the array subscript sets the seen flag while
      # the unset array expands to nothing.
      PS0='\[\e]133;C;$(_terax_preexec)\e\\\]${_terax_noop[$((_terax_block_seen=1))]}'"${PS0:-}"
    else
      PS0='\[\e]133;C;$(_terax_preexec)\e\\\]'"${PS0:-}"
    fi
  fi

  _terax_precmd
  _terax_history_sync
fi
:
