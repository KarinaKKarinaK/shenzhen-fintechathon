# Third party notices

Open source software used by Zishi, with its licence. The full licence texts are in `web/node_modules/<package>/LICENSE` after `pnpm install`, and in `contracts/lib/forge-std/LICENSE-MIT` and `LICENSE-APACHE`. Zishi itself is MIT, see `LICENSE`.

## Application (`web/package.json`)

| Package | Version | Licence | Home |
|---|---|---|---|
| @react-three/drei | 10.7.9 | MIT | https://github.com/pmndrs/drei |
| @react-three/fiber | 9.8.2 | MIT | https://github.com/pmndrs/react-three-fiber#readme |
| @react-three/postprocessing | 3.0.4 | MIT | https://github.com/pmndrs/react-postprocessing#readme |
| @tailwindcss/turbopack | 4.3.3 | MIT | https://tailwindcss.com |
| @types/node | 20.19.43 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node |
| @types/react | 19.3.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react |
| @types/react-dom | 19.3.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom |
| @types/three | 0.186.0 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/three |
| ai | 7.0.143 | Apache-2.0 | https://ai-sdk.dev/docs |
| eslint | 9.39.5 | MIT | https://eslint.org |
| eslint-config-next | 16.4.2 | MIT | https://nextjs.org/docs/app/api-reference/config/eslint |
| framer-motion | 14.4.0 | MIT | https://github.com/motiondivision/motion#readme |
| next | 16.4.2 | MIT | https://nextjs.org |
| postprocessing | 6.37.8 | Zlib | https://github.com/pmndrs/postprocessing |
| react | 19.3.0 | MIT | https://react.dev/ |
| react-dom | 19.3.0 | MIT | https://react.dev/ |
| tailwindcss | 4.3.3 | MIT | https://tailwindcss.com |
| three | 0.186.1 | MIT | https://threejs.org/ |
| tsx | 4.19.2 | MIT | https://tsx.is |
| typescript | 5.9.3 | Apache-2.0 | https://www.typescriptlang.org/ |
| viem | 2.57.7 | MIT | https://viem.sh |
| zod | 4.6.7 | MIT | https://zod.dev |

## Contracts

| Package | Version | Licence | Home |
|---|---|---|---|
| forge-std | vendored in `contracts/lib/forge-std` | MIT or Apache-2.0 | https://github.com/foundry-rs/forge-std |
| Foundry (forge, cast) | 1.8.5, build tool only | MIT or Apache-2.0 | https://github.com/foundry-rs/foundry |
| solc | 0.8.26, build tool only | GPL-3.0 | https://github.com/ethereum/solidity |

## Services

| Service | Use |
|---|---|
| Base Sepolia public RPC (sepolia.base.org) | Reads balances and sends the demo wallet's transactions |
| Sourcify | Source verification of the deployed contracts |
| Vercel | Hosting of the demo |
| Vercel AI Gateway or Anthropic API, optional | Written explanations only when a key is set; decisions never depend on it |
