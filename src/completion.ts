/**
 * Shell completion script generation.
 * Static scripts that do not depend on a globally installed 'stx' binary.
 */

export const SUBCOMMANDS = [
  'add-server',
  'list-servers',
  'remove-server',
  'pair',
  'status',
  'errors',
  'events',
  'completion',
] as const;

export const COMMAND_FLAGS: Record<string, string[]> = {
  status: ['--server', '--all', '--json'],
  errors: ['--server', '--all', '--json', '--clear'],
  events: ['--server', '--types', '--since', '--limit', '--json'],
  pair: [
    '--server',
    '--folder-id',
    '--label',
    '--local-path',
    '--server-path',
    '--local-url',
    '--server-key',
    '--ssh',
    '--ignore-git',
    '--ignore-template',
  ],
  'add-server': ['--api-key'],
  'list-servers': [],
  'remove-server': [],
  completion: [],
};

export type Shell = 'bash' | 'zsh';

export function generateBashCompletion(): string {
  const subcommands = SUBCOMMANDS.join(' ');

  const flagCases = Object.entries(COMMAND_FLAGS)
    .filter(([, flags]) => flags.length > 0)
    .map(
      ([cmd, flags]) =>
        `        ${cmd}) COMPREPLY=( $(compgen -W "${flags.join(' ')}" -- "\${cur}") ) ;;`
    )
    .join('\n');

  return `# Bash completion for stx
# Install: stx completion bash >> ~/.bashrc && source ~/.bashrc
# Or: stx completion bash > /etc/bash_completion.d/stx

_stx_completions() {
    local cur prev words cword
    _init_completion || return

    local subcommands="${subcommands}"

    # If completing the first argument (subcommand)
    if [[ \${cword} -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "\${subcommands}" -- "\${cur}") )
        return
    fi

    # Get the subcommand
    local subcmd="\${words[1]}"

    # If current word starts with -, complete flags
    if [[ "\${cur}" == -* ]]; then
        case "\${subcmd}" in
${flagCases}
            *) COMPREPLY=() ;;
        esac
        return
    fi

    # Default: file completion for path arguments
    case "\${prev}" in
        --local-path|--server-path)
            _filedir -d
            ;;
        --ignore-template)
            COMPREPLY=( $(compgen -W "nodepython node python" -- "\${cur}") )
            ;;
        --types)
            COMPREPLY=( $(compgen -W "FolderCompletion FolderSummary DeviceConnected DeviceDisconnected ItemStarted ItemFinished StateChanged ConfigSaved" -- "\${cur}") )
            ;;
    esac
}

complete -F _stx_completions stx
`;
}

export function generateZshCompletion(): string {
  return `#compdef stx
# Zsh completion for stx
# Install: stx completion zsh > ~/.zsh/completions/_stx && echo 'fpath=(~/.zsh/completions $fpath); autoload -Uz compinit && compinit' >> ~/.zshrc
# Or: stx completion zsh > /usr/local/share/zsh/site-functions/_stx

_stx() {
    local -a subcommands
    subcommands=(
        'add-server:Register a Syncthing server'
        'list-servers:List registered servers'
        'remove-server:Remove a registered server'
        'pair:Pair a folder from this Mac to a server'
        'status:Query Syncthing status'
        'errors:View or clear Syncthing errors'
        'events:View Syncthing events'
        'completion:Generate shell completion script'
    )

    _arguments -C \\
        '1: :->command' \\
        '*: :->args'

    case $state in
        command)
            _describe -t commands 'stx commands' subcommands
            ;;
        args)
            case $words[2] in
                add-server)
                    _arguments \\
                        '1:name:' \\
                        '2:url:' \\
                        '--api-key[Server API key]:key:'
                    ;;
                remove-server)
                    _arguments '1:name:'
                    ;;
                list-servers)
                    ;;
                status)
                    _arguments \\
                        '--server[Server name]:name:' \\
                        '--all[Query all servers]' \\
                        '--json[Output as JSON]'
                    ;;
                errors)
                    _arguments \\
                        '--server[Server name]:name:' \\
                        '--all[Query all servers]' \\
                        '--json[Output as JSON]' \\
                        '--clear[Clear errors]'
                    ;;
                events)
                    _arguments \\
                        '--server[Server name]:name:' \\
                        '--types[Event types]:types:' \\
                        '--since[Event ID to start from]:id:' \\
                        '--limit[Max events]:n:' \\
                        '--json[Output as JSON]'
                    ;;
                pair)
                    _arguments \\
                        '--server[Server name]:name:' \\
                        '--folder-id[Folder ID]:id:' \\
                        '--label[Folder label]:label:' \\
                        '--local-path[Local path]:path:_files -/' \\
                        '--server-path[Server path]:path:' \\
                        '--local-url[Local Syncthing URL]:url:' \\
                        '--server-key[Server API key]:key:' \\
                        '--ssh[SSH host]:host:' \\
                        '--ignore-git[Ignore .git directory]' \\
                        '--ignore-template[Ignore template]:template:(nodepython node python)'
                    ;;
                completion)
                    _arguments '1:shell:(bash zsh)'
                    ;;
            esac
            ;;
    esac
}

_stx "$@"
`;
}

export function generateCompletion(shell: Shell): string {
  switch (shell) {
    case 'bash':
      return generateBashCompletion();
    case 'zsh':
      return generateZshCompletion();
    default:
      throw new Error(`Unsupported shell: ${shell}. Use 'bash' or 'zsh'.`);
  }
}
