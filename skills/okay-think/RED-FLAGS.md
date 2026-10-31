# Design red flags

Screen every candidate before the judge sees it. A red flag is a reason to revise or reject the shape. Assume the next contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Prefer the design where a change that looks right from one file is right for the whole repo.

## Shallow module

A large interface that hides little. Judge depth by the capability hidden behind the public surface relative to the size of that surface. A deep module concentrates capability behind one interface; a deep call chain only scatters understanding across layers.

- Callers coordinate several methods to finish one operation.
- Public options expose internal stages or implementation choices.
- Learning the interface does not save the caller from learning the implementation.

## Information leakage

Several modules depend on the same internal decision (a representation, a policy, a protocol detail), so changing it needs coordinated edits. Re-exporting transport or wire types is leakage: parse external data into domain types behind the interface and keep storage schemas and framework objects private.

## Temporal decomposition

Modules organised by execution order (load, validate, transform, save) instead of the knowledge they own. They repeat one representation and its invariants across boundaries. Group by domain knowledge and ownership.

## Pass-through method

A method that forwards the same arguments to another method of the same shape adds a layer and hides nothing. Remove it, or move the responsibility to the module that can finish the operation. Keep a forwarding boundary only when it adds policy, adaptation, or a distinct abstraction.

## Split ownership

More than one module writes the same state or keeps its own copy. An agent editing one writer cannot see the others. Give each piece of state one owner; others read it or ask the owner to change it.

## Two ways to do one task

The design supports two ways to do the same thing. An agent copies whichever it finds first, so both keep gaining callers. Keep one, move callers off the other, delete it in the same change.

## Importable internals

A caller can import a module's internals, so the shortest path that compiles makes them part of the interface. Make internals unreachable from outside so an import from outside fails the build.

## Hand-synced list

Two or more places list the same items, and adding one means editing every list. Keep one list and derive the others; if a list cannot be derived, make the build fail when they disagree.
