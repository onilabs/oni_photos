This directory contains external source code imported from external projects. 

In order to simplify code management, we deliberately *don't* use git submodules, but have the relevant source code checked in directly into the stratifiedjs repository.

To pull in updates from the external projects, you can use the utility 'fetch-external-deps' to replace the directories under external/ with their corresponding github repositories. After running 'fetch-external-deps' you will be left with a separate git repository in each of the directories under external/. You can then update from upstream by:
- cd'ing into the relevant directory 
- running 'git pull' 
- resolving merge conflicts
- updating the base revision in external/sources.txt
- IMPORTANT: cd back into the app repo (i.e. external/ or higher) 
- commit the changes to the app repo

