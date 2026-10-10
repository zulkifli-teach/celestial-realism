<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Preserve the uploaded educational simulator's DOM controls and Three.js engine in a client-mounted module, so all five existing learning modes remain intact.
- Compute orbit geometry and animated positions from one shared Kepler solver in the XZ plane, preventing path/planet mismatches.
- Load verified public-domain celestial surface maps through checked-in Lovable asset pointers, never runtime third-party sources.
