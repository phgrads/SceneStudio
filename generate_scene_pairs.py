__author__ = "Mihail Eric"

"""Generates the scene_pairs.txt file by providing the path to the directory containing subdirectories of jpg images.

Usage: generate_scene_pairs.py <path>
"""

import sys, os
import logging

logging.basicConfig(level=logging.INFO)

logging.info("Starting file creation...")

path_to_images = sys.argv[1]

path_prefix = "https://dovahkiin.stanford.edu"

os.chdir(path_to_images)
all_subdirs = [d for d in os.listdir('.') if os.path.isdir(d)] #Names of subdirectories located in given directory

with open('scene_pairs_select.txt', 'w') as file:
    file.write('id url1 url2\n')
    for dirs in all_subdirs:
        curr_dir = os.getcwd()
        new_dir = os.path.join(curr_dir, dirs)
        os.chdir(new_dir) #Change to one of subdirectories

        before_after_pairs = [] #Stores (before,after) image file names
        all_files = [f for f in os.listdir('.') if os.path.isfile(f)] #Get names of all files in subdirectory
        filename_split_file_mapping = {f: f.split('_') for f in all_files} #Map from filename to a list of the filename split
        

        split_files = filename_split_file_mapping.values()
        #Iterate over all pairs of files in directory
        for f1 in range(len(split_files)):
            for f2 in range(len(split_files)):
                if f1 == f2:
                    continue
                if split_files[f1][1] == split_files[f2][1]: #These files refer to the same sequence of images
                    if split_files[f1][2] == 'before.jpg' and split_files[f2][2] =='black.jpg':
                        before_file = os.path.join(path_prefix + new_dir, '_'.join(split_files[f1]))
                        black_file = os.path.join(path_prefix + new_dir, '_'.join(split_files[f2]))
                        name = '_'.join(split_files[f1][:2])
                        file.write(name + " " + before_file + " " + black_file + "\n")


        os.chdir('..')

logging.info("Finished file creation!")
