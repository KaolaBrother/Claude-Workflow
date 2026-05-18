# Planner Notes - issue-55

## Candidate Strategies

### Option A - Minimal skeleton plus forge-aware installer

Create the GitLab plugin tree, manifests, marketplace entries, `install.sh`/`uninstall.sh` forge flags, and a no-op GitLab test script. Allow empty GitLab command/script/hook directories during this skeleton phase.

### Option B - Skeleton plus copied placeholder commands/scripts

Copy current GitHub commands/scripts into the GitLab tree immediately, but leave most GitHub content unported until #56/#57.

### Option C - Shared installer/plugin abstraction first

Refactor install and marketplace code into a generic forge abstraction before creating the GitLab skeleton.

## Evaluation

Option A matches issue #55 directly and unblocks the parallel follow-up issues without creating misleading runnable GitLab commands.

Option B makes `install.sh --forge=gitlab` look more complete, but it risks installing GitHub-flavored commands under a GitLab edition and violates the isolation intent until #56/#57 finish.

Option C overbuilds the smallest phase and conflicts with #54's decision to avoid shared forge abstractions.

## Recommendation

Select Option A.
