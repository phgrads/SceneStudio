#!/usr/bin/env python3

# Simple python script to generate a list of scene ids and urls for interact2desc

# Note that there are two files: scene_pairs.txt (which contains all non-select interactions) and scene_pairs_select.txt (which contains all select interactions)

def makeline(*strings):
    return '\t'.join(strings) + '\n'

selection_ids = frozenset([1,2])
n_interactions = 19

with open('scene_pairs.txt','w') as f, open('scene_pairs_select.txt','w') as g:
    f.write(makeline('id','url1','url2'))
    g.write(makeline('id','url1','url2'))

    for i in range(n_interactions):
        scene_id = 'scene_pair%04d' % i
        url1 = 'https://dovahkiin.stanford.edu/text2scene/interactions/interaction%04db.jpg' % i
        url2 = 'https://dovahkiin.stanford.edu/text2scene/interactions/interaction%04da.jpg' % i

        fd = g if i in selection_ids else f # which scene_pairs file to write to
        fd.write(makeline(scene_id, url1, url2))
    
