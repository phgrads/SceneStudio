import os
import subprocess
import time


'''
Globals
'''
port = '8983'
metaDir = '../../public/data/metadata'
solrDir = 'modelsearch'


'''
Start the Solr web service
'''
def StartSolr():
    
    curdir = os.getcwd()
    
    ## First, start the server
    print('======================================================')
    print('STARTING SOLR...')
    print('======================================================')
    os.chdir(solrDir)
    p = subprocess.Popen(['java', '-jar', 'start.jar'])
    os.chdir(curdir)
    
    ## Wait until server has started
    print('======================================================')
    print('WAITING FOR SERVER TO START...')
    print('======================================================')
    errcode = 7
    retcode = errcode
    while retcode == errcode:
        retcode = subprocess.call(['curl', 'http://localhost:{p}/solr/update'.format(p=port)])
    
    ## Then, index all of the metadata files we currently have on disk
    print('======================================================')
    print('AGGREGATING JSON METADATA...')
    print('======================================================')
    aggf = open('tmp_agg.json', 'w')
    aggf.write('[')
    os.chdir(metaDir)
    metafiles = [mf for mf in os.listdir('.') if mf.endswith('.json')]
    numFiles = len(metafiles)
    print numFiles
    for i in range(0, numFiles):
        mf = metafiles[i]
        f = open(mf, 'r')
        aggf.write(f.read())
        if i < numFiles - 1:
            aggf.write(', ')
    os.chdir(curdir)
    aggf.write(']')
    aggf.close()
    print('======================================================')
    print('SENDING AGGREGATED DATA TO SOLR...')
    print('======================================================')
    subprocess.call(['curl', 'http://localhost:{p}/solr/update?commit=true'.format(p=port),
                    '--data-binary', '@tmp_agg.json',
                    '-H', 'Content-type:application/json'])
    os.remove('tmp_agg.json')
    print('======================================================')
    print('SOLR SUCCESSFULLY STARTED; RUNNING...')
    print('======================================================')


if __name__ == '__main__':
    
    # Solr
    StartSolr()